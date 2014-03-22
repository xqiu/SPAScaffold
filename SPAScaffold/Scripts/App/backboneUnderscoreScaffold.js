/// <reference path="../jquery-1.9.1.js" />
/// <reference path="jsonSamples.js" />
/// <reference path="app.datamodel.js" />
/// <reference path="json.datamodel.js" />
/// <reference path="../underscore.js" />
/// <reference path="../backbone.js" />

var dataModel = new AppDataModel();

$(function () {
    //'use strict';

    var AppModel = Backbone.Model.extend({
        defaults: {
            runnablePageUrl: '',
        },

        jsonText: '',
        jsonUrl: '',
        jsonUrlType: "jsonp",
        scaffoldHtml: '',
        scaffoldJS: '',
        sampleFinalHtml: '',
        useTable: true,
        useCRUD: true,
        useData: true,
        chosenSampleUrl: '',

        errorMessage: '',

        htm: "",
        js: "",
        templateHtmlList: [],
        usedSpecialKeyName: false,

        jsonClasses: [],
        jItem: '',

        initialize: function () {
        },

        validate: function (attributes) {
        },

        isUsingRemoteUrl: function () {
            var url = this.jsonUrl.toLowerCase();
            return (url.indexOf('http') === 0 || url.indexOf('/') === 0);
        },

        scaffoldGetClick: function () {
            this.htm = "";
            this.js = "";
            this.templateHtmlList = [];
            this.usedSpecialKeyName = false;
            this.sampleFinalHtml = "";
            this.errorMessage = null;

            if (!this.isUsingRemoteUrl() && this.useData) {
                this.errorMessage = "Not using remote url, thus not generating data layer";
            }

            var data = this.jsonText;
            if (data === null) {
                return;
            }
            var jData;
            try {
                jData = $.parseJSON(data);
            }
            catch (ex) {
                this.errorMessage = ex.message;
            }
            if (jData === null) {
                this.errorMessage = "Cannot parse Json";
                return;
            }

            this.jsonClasses = [];
            this.jItem = null;
            this.jItem = new jsonItem("rootObject", jData, this.jsonClasses, null);

            this.GenerateHtml();  //has to be before JavaScript generation, as we set usedSpecialKeyName here
            this.GenerateJavaScript(jData);

            headContent = "";
            this.refresh(headContent, this.htm, this.js);
        },

        isGeneratingDataLayer: function () {
            return this.useData && this.isUsingRemoteUrl();
        },

        isNonObjectArray: function (item) {
            if (item === null) {
                return false;
            }
            if (item.isArray && item.childrenUnNamed && item.elements.length > 0 && !item.elements[0].isObject) {
                return true;
            }
            return false;
        },

        GenerateJavaScript: function (data) {
            if (this.isGeneratingDataLayer()) {
                this.js += this.generateAppDataModel();
            } else {
                this.js += "var myData = " + formatJson(data) + ";\n";
            }
            this.js += "$(function(){\n";

            var jstext = "";

            for (var i = 0; i < this.jsonClasses.length; i++) {
                var item = this.jsonClasses[i];

                jstext += this.GenerateJsItemModel(item);
                jstext += this.GenerateJsItemView(item);

                if (item.parent !== null && item.parent.isArray && item.parent.childrenUnNamed) {
                    jstext += "var " + item.getClassName() + "List = Backbone.Collection.extend({\n";
                    if (item.elements.length > 0) {
                        jstext += "    model: " + item.getClassName() + ",\n";
                    }
                    jstext += "});\n";

                    if (item.parent.name != "rootObject") {
                        jstext += this.GenerateJsItemModel(item.parent);
                        jstext += this.GenerateJsItemView(item.parent);
                    }
                }
            }

            if (this.GetRootElement() != null) {
                jstext += "var AppModel = Backbone.Model.extend({\n    defaults: {\n";
                jstext += "        " + this.GetRootElement().name + " : null,\n";
                if (this.isGeneratingDataLayer()) {
                    jstext += "        dataModel : new AppDataModel(),\n";
                }
                jstext += "    },\n});\n";

                jstext += this.GenerateAppView(this.GetRootElement());

                if (this.isGeneratingDataLayer()) {
                    jstext += "var myApp = new AppView({ model: new AppModel() });\n";
                } else {
                    jstext += "var myApp = new AppView({ model: new AppModel() });\n";
                }
            }
            jstext += "});\n";

            this.js += jstext;

            if (this.usedSpecialKeyName) {
                this.js += jasonGetValueConst;
            }

            this.scaffoldJS = this.js;
        },

        generateAppDataModel: function () {
            var text = "";
            text += "function AppDataModel() {\n";
            text += "    var self = this;\n";
            text += "    function getSecurityHeaders() {\n";
            text += "        var accessToken = sessionStorage['accessToken'] || localStorage['accessToken'];\n";
            text += "        if (accessToken) {\n";
            text += "            return { \"Authorization\": \"Bearer \" + accessToken };\n";
            text += "        }\n";
            text += "        return {};\n";
            text += "    }\n";
            text += "    this.ajaxRequest = function (type, url, data, dataType) {\n";
            text += "        var options = {\n";
            text += "            dataType: dataType || 'json',\n";
            text += "            contentType: 'application/json',\n";
            text += "            cache: false,\n";
            text += "            type: type,\n";
            text += "            data: data ? data.toJson() : null,\n";
            text += "            headers: getSecurityHeaders()\n";
            text += "        };\n";
            text += "        return $.ajax(url, options);\n";
            text += "    };\n";

            var url = this.jsonUrl.trim();
            if (url[url.length - 1] != '/') {
                if (this.jsonUrlType == "json") {
                    url += '/';
                }
            } else {
                if (this.jsonUrlType == "jsonp") {
                    url[url.length - 1] = ' ';
                    url = url.trim();
                }
            }
            text += "    this.rootUrl = '" + url + "';\n";
            text += "    this.getListRootObject = function () {\n";
            text += '        return this.ajaxRequest("GET", this.rootUrl, null, "' + this.jsonUrlType + '");\n';
            text += "    };\n";
            for (var i = 0; i < this.jsonClasses.length; i++) {
                var item = this.jsonClasses[i];
                if (item.parent !== null && item.parent.isArray) {
                    var firstElement = item.elements[0];

                    //find a most likely key
                    var keyName = firstElement.name;
                    for (var j = 0; j < item.elements.length ; j++) {
                        var element = item.elements[0];
                        if (element.name.toLowerCase().indexOf("id") >= 0) {
                            keyName = element.name;
                            break;
                        }
                    }

                    if (item.hasNoName) {
                        text += "    this.getList" + item.getClassName() + " = function () {\n";
                        text += '        return this.ajaxRequest("GET", this.rootUrl, null, "' + this.jsonUrlType + '");\n';
                        text += "    };\n";
                        text += "    this.delete" + item.getClassName() + " = function (data) {\n";
                        text += '        return this.ajaxRequest("DELETE", this.rootUrl + data.get("' + keyName + '"), null, "' + this.jsonUrlType + '");\n';
                        text += "    };\n";
                        text += "    this.update" + item.getClassName() + " = function (data) {\n";
                        text += '        return this.ajaxRequest("PUT", this.rootUrl + data.get("' + keyName + '"), data, "' + this.jsonUrlType + '");\n';
                        text += "    };\n";
                        text += "    this.new" + item.getClassName() + " = function (data) {\n";
                        text += '        return this.ajaxRequest("POST", this.rootUrl, data, "' + this.jsonUrlType + '");\n';
                        text += "    };\n";
                    }
                }
            }

            text += "}\n";
            return text;
        },

        GenerateJsItemModel: function (item) {
            var jstext = "";
            jstext += "var " + item.getClassName() + " = Backbone.Model.extend({\n";
            jstext += this.GetDefaultsCode(item);

            var addAndEditItemText = "";
            for (var j = 0; j < item.elements.length; j++) {
                var element = item.elements[j];
            }

            if (this.useCRUD && item.parent !== null && item.parent.isArray) {
                jstext += this.GetEditItemCode(item.name, item.getClassName());

                jstext += "    toJson : function () {\n";
                jstext += "        return JSON.stringify({\n";
                for (var i = 0; i < item.elements.length; i++) {
                    if (!item.elements[i].isArray || this.isNonObjectArray(item.elements[i])) {
                        jstext += "            " + this.getElementName(item.elements[i]) + ": this.get('" + item.elements[i].oriName + "'),\n";
                    }
                }
                jstext += "        });\n";
                jstext += "    },\n";
            }
            jstext += "});\n";

            return jstext;
        },

        GenerateJsItemView: function (item) {
            var jstext = "";
            var indent = "    ";
            jstext += "var " + item.getClassName() + "View = Backbone.View.extend({\n";
            jstext += indent + "tagName : '";
            if (item.parent !== null && item.parent.isArray) {
                jstext += this.useTable ? "tr" : "li";
            } else {
                jstext += "div";
            }
            jstext += "',\n";

            jstext += indent + "template : _.template($('#" + item.name + "_template').html()),\n";
            jstext += indent + "initialize: function () {\n";

            var element;
            var i;
            if (item.isArray) {
                element = item.elements[0];
                if (!this.isNonObjectArray(item)) {
                    
                    jstext += indent + "    if (this.model.get('" + element.name + "List') == null) {\n";
                    jstext += indent + "       this.model.set('" + element.name + "List', new " + element.getClassName() + "List());\n";
                    jstext += indent + "    }\n";

                    jstext += indent + "    var self = this;\n";

                    jstext += indent + "    $.each(this.model.get('myData') || [], function (key, value) {\n";
                    jstext += indent + "        value = value || {};\n";
                    if (this.isNonObjectArray(this.jsonClasses[this.jsonClasses.length - 1])) {
                        jstext += indent + "            value = {" + this.jsonClasses[this.jsonClasses.length - 1].name + " : value}\n";
                    }
                    jstext += indent + "            value.parent = self.model;\n";

                    if (this.isGeneratingDataLayer()) {
                        jstext += indent + "            value.dataModel = self.model.get('dataModel');\n";
                    }

                    jstext += indent + "            self.model.get('" + element.name + "List').push(new ";
                    if (this.jsonClasses[this.jsonClasses.length - 1].elements.length === 0) {
                        jstext += "value);\n";
                    } else {
                        jstext += element.getClassName() + "(value));\n";
                    }

                    jstext += indent + "    });\n";
                    jstext += indent + "    this.listenTo(this.model.get('" + element.name + "List'), 'all', this.render);\n";
                }
            } else {
                jstext += indent + "    this.listenTo(this.model, 'change', this.render);\n";
                if (this.useCRUD) {
                    jstext += indent + "    this.listenTo(this.model, 'destroy', this.remove);\n";
                }
            }
            jstext += indent + "},\n";

            jstext += indent + "render: function () {\n";
            jstext += indent + "    this.$el.html(this.template(this.model.toJSON()));\n";

            if (item.isArray) {
                element = item.elements[0];
                if (!this.isNonObjectArray(item)) {
                    jstext += indent + "    var self = this;\n";
                    jstext += indent + "    this.model.get('" + element.name + "List').each(function (value) {\n";
                    jstext += indent + "        var view = new " + element.getClassName() + "View({ model: value });\n";
                    jstext += indent + "        $('." + item.name + "_body', self.$el).append(view.render().el);\n";
                    jstext += indent + "    }, this);\n";
                }
            } else {
                for (i = 0; i < item.elements.length; i++) {
                    element = item.elements[i];
                    if (element.isObject && !this.isNonObjectArray(element)) {
                        jstext += indent + "    var view = new " + element.getClassName() + "View({\n";
                        jstext += indent + "        model: new " + element.getClassName() + "(";

                        if (element.isArray) {
                            jstext += "{\n" + indent + "        myData: ";
                        }

                        jstext += "this.model.get('" + element.oriName + "')";

                        if (element.isArray) {
                            jstext += ",\n";
                            if (this.isUsingRemoteUrl()) {
                                jstext += indent + "        dataModel: this.model.get('dataModel'),\n";
                                jstext += indent + "        parent: this.model,\n";
                            }
                            jstext += "}";
                        }
                        jstext += ") });\n";

                        if (item.name == "rootObject") {
                            jstext += indent + "    this.$('." + item.name + "_body').append(view.render().el);\n";
                        } else {
                            if (item.parent != null & item.parent.isArray) {
                                jstext += indent + "    this.$('." + item.name + "_" + element.name + "_body').append(view.render().el);\n";
                            } else {
                                jstext += indent + "    this.$('." + item.name + "_body').append(view.render().el);\n";
                            }
                        }
                    }
                }
            }

            jstext += indent + "    return this;\n";
            jstext += indent + "},\n";

            if (this.useCRUD) {
                jstext += indent + "events: {\n";
                if (item.isArray) {
                    jstext += indent + "    'click .addNewRowButton' : 'addNewRow',\n";
                } else if (item.parent !== null && item.parent.isArray) {
                    jstext += indent + "    'click .editTextButton': 'editItemClick',\n";
                    jstext += indent + "    'click .deleteButton': 'deleteItemClick',\n";
                }
                jstext += indent + "},\n";

                if (item.isArray) {
                    element = item.elements[0];
                    jstext += indent + "addNewRow: function () {\n";
                    jstext += indent + "    var value = {\n";
                    jstext += indent + "        parent: this.model,\n";
                    jstext += indent + "        dataModel: this.model.get('dataModel'),\n";
                    jstext += indent + "        isNew: true,\n";
                    jstext += indent + "        isEdit: true,\n";
                    jstext += indent + "        editText: 'save',\n";
                    jstext += indent + "    };\n";

                    jstext += indent + "    this.model.get('" + element.name + "List').push(new " + element.getClassName() + "(value));\n";

                    jstext += indent + "},\n";

                } else {
                    jstext += indent + "editItemClick: function () {\n";
                    jstext += indent + "    if (this.model.get('isEdit')) {\n";
                    jstext += indent + "        this.model.set({\n";

                    for (i = 0; i < item.elements.length; i++) {
                        var element = item.elements[i];
                        if (!element.isObject) {
                            jstext += indent + "            '" + element.oriName + "': this.$('." + item.name + "_" + element.name + "').val(),\n";
                        }
                    }

                    jstext += indent + "        });\n";
                    jstext += indent + "    }\n";
                    jstext += indent + "    this.model.showEditItem();\n";
                    jstext += indent + "},\n";

                    jstext += indent + "deleteItemClick: function () {\n";
                    jstext += indent + "    this.model.deleteItem(this);\n";
                    jstext += indent + "}\n";
                }
            }
            jstext += "});\n";

            return jstext;
        },

        GetRootElement: function () {
            return this.jsonClasses[this.jsonClasses.length - 1];
        },

        GenerateAppView: function (item) {
            var jstext = "";
            var indent = "    ";
            jstext += "var AppView = Backbone.View.extend({\n";
            jstext += indent + "el : $('#MainDiv'),\n";

            jstext += indent + "initialize: function () {\n";

            jstext += indent + "    var self = this;\n";
            if (this.isGeneratingDataLayer()) {
                jstext += indent + "    this.model.get('dataModel').getListRootObject().done(function (data) {\n";
                if (this.GetRootElement().isArray) {
                    jstext += indent + "        data = { myData: data };\n";
                }
                jstext += indent + "        data.dataModel = self.model.get('dataModel');\n";
            } else {
                if (this.GetRootElement().isArray) {
                    jstext += indent + "        data = { myData: myData };\n";
                } else {
                    jstext += indent + "        data = myData;\n";
                }
            }
            jstext += indent + "        data.parent = self.model;\n";
            jstext += indent + "        self.model.set('" + this.GetRootElement().name + "', new " + this.GetRootElement().getClassName() + "(data));\n";
            jstext += indent + "        self.render();\n";

            if (this.isGeneratingDataLayer()) {
                jstext += indent + "    }).fail(function (msg) {\n";
                jstext += indent + "        console.log('Get failed: ' + JSON.stringify(msg.responseText));\n";
                jstext += indent + "    });\n";
            }

            jstext += indent + "},\n";

            jstext += indent + "render: function () {\n";

            jstext += indent + "    var view = new " + this.GetRootElement().getClassName() + "View({ model: this.model.get('" + this.GetRootElement().name + "')});\n";
            jstext += indent + "    this.$('.main_body').append(view.render().el);\n";

            //}
            jstext += indent + "},\n";
            jstext += "});\n";

            return jstext;
        },

        GetDefaultsCode: function (item) {
            var text = "";
            text += "    defaults : {\n";
            text += "        isNew: false,\n";
            text += "        isEdit: false,\n";
            text += "        editText: 'edit',\n";
            text += "        parent: null,\n";
            text += "        dataModel: null,\n";

            if (this.isNonObjectArray(item.parent)) {
                text += "        " + item.parent.name + ": null,\n";
            } else if (item.isArray) {
                text += "        myData: null,\n";
                if (!this.isNonObjectArray(item)) {
                    text += "        " + item.elements[0].name + "List: null,\n";
                }
            }

            if (!item.isArray) {
                for (var j = 0; j < item.elements.length; j++) {
                    var element = item.elements[j];
                    text += '        ' + this.getElementName(element) + ' : null,\n';
                }
            }
            text += "    },\n";
            return text;
        },

        GetAddAndEditItemCode: function (parentElementName, childClassName) {
            var text = "";
            text += "    this.addAndEditItem = function () {\n";
            text += "        var item = new " + childClassName + "(this.$scope, null, self";
            if (this.isGeneratingDataLayer()) {
                text += ", this.dataModel";
            }
            text += ");\n";

            text += "        item.isNew = true;\n";
            text += "        this." + parentElementName + ".push(item);\n";
            text += "        item.showEditItem();\n";
            //text += "        this.$scope.$apply();\n";
            text += "    };\n";
            return text;
        },

        GetEditItemCode: function (name, elmentClassName) {
            var text = "";
            text += "    showEditItem : function () {\n";
            text += "        var self = this;\n";
            text += "        if (self.get('isEdit')) {\n";
            text += "            self.set('isEdit', false);\n";
            text += "            self.set('editText', 'edit');\n";

            if (this.isGeneratingDataLayer()) {
                text += "            if (self.get('isNew')) {\n";
                text += "                self.get('dataModel').new" + elmentClassName + "(self)\n";
                text += "                    .done(function (data) {\n";
                text += "                        self.set('isNew', false);\n";
                text += "                    })\n";
                text += "                    .fail(function (msg) {\n";
                text += "                        console.log('Create failed: ' + JSON.stringify(msg.responseText));\n";
                text += "                    });\n";
                text += "            }\n";
                text += "            else {\n";
                text += "                self.get('dataModel').update" + elmentClassName + "(self)\n";
                text += "                    .done(function (data) {\n";
                text += "                    })\n";
                text += "                    .fail(function (msg) {\n";
                text += "                        console.log('Update failed: ' + JSON.stringify(msg.responseText));\n";
                text += "                    });\n";
                text += "            }\n";
            }

            text += "        }\n";
            text += "        else {\n";
            text += "            self.set('isEdit', true);\n";
            text += "            self.set('editText', 'save');\n";
            text += "        }\n";
            text += "    },\n";
            text += "    deleteItem : function (view) {\n";
            text += "        var self = this;\n";

            var indent = "";
            if (this.isGeneratingDataLayer()) {
                text += "        self.get('dataModel').delete" + elmentClassName + "(self)\n";
                text += "            .done(function (data) {\n";
                indent = "        ";
            }

            text += indent + "        self.get('parent').get('" + name + "List').remove(self);\n";
            text += indent + "        view.remove();\n";

            if (this.isGeneratingDataLayer()) {
                text += "            })\n";
                text += "            .fail(function (msg) {\n";
                text += "                console.log('Delete failed: ' + JSON.stringify(msg.responseText));\n";
                text += "            });\n";
            }
            text += "    },\n";
            return text;
        },

        GenerateHtml: function () {
            this.htm += "<div id='MainDiv'>\n    <div class='main_body'></div>\n";

            for (var i = 0; i < this.jsonClasses.length; i++) {
                this.generateItemTemplate(this.jsonClasses[i]);

                var parent = this.jsonClasses[i].parent;
                if (parent !== null && parent.isArray && parent.childrenUnNamed && parent.name != "rootObject") {
                    this.generateItemTemplate(parent);
                }
            }

            this.htm += "</div>\n";

            for (i = 0; i < this.templateHtmlList.length; i++) {
                this.htm += this.templateHtmlList[i];
            }

            this.scaffoldHtml = this.htm;
        },

        generateItemTemplate: function (jClass) {
            var currentIndent = "    ";
            var indent = "";

            var isCrud = false;
            if (this.useCRUD) {
                isCrud = true;
                if (jClass.isArray && jClass.elements.length == 1 && jClass.elements[0].hasNoName && !jClass.elements[0].isObject) {
                    isCrud = false;
                }
            }

            if (jClass.isArray && jClass.elements.length === 0) {
                //empty array, we can't do anything
                return;
            }

            var templateHeader = "<script type='text/template' id='";
            templateHeader += jClass.name;
            templateHeader += "_template'>\n";
            var template = "";
            var bodyClassDone = false;
            var i;
            var element;

            if (jClass.isArray) {
                if (!this.useTable || this.isNonObjectArray(jClass)) { //for [a,b,c] arrays...
                    if (jClass.name != "rootObject") {
                        template += indent + "<ul class='media-list " + jClass.name + "_body'/>\n";
                        bodyClassDone = true;
                    }
                } else {
                    template += indent + "<table class='table'>\n";
                    template += indent + currentIndent + "<thead>\n";
                    template += indent + currentIndent + currentIndent + "<tr>\n";

                    for (i = 0; i < jClass.elements.length; i++) {
                        element = jClass.elements[i];
                        if (element.isObject) {
                            var subElements = element.elements;
                            for (var j = 0; j < subElements.length; j++) {
                                if (!subElements[j].hasNoName) {
                                    template += indent + currentIndent + currentIndent + currentIndent + "<th>" + subElements[j].name + "</th>\n";
                                }
                            }
                        } else if (element.hasNoName) {
                        } else {
                            template += indent + currentIndent + currentIndent + currentIndent + "<th>" + element.name + "</th>\n";
                        }
                    }

                    template += indent + currentIndent + currentIndent + "</tr>\n";
                    template += indent + currentIndent + "</thead>\n";

                    template += indent + currentIndent + "<tbody class='" + jClass.name + "_body'></tbody>\n";
                    if (this.useCRUD) {
                        template += indent + currentIndent + "<tfoot class='" + jClass.name + "_tfoot'><tr><td>\n";
                        template += indent + currentIndent + currentIndent + "<button class='btn btn-primary btn-lg addNewRowButton'>Add new row</button>\n";
                        template += indent + currentIndent + "</td></tr></tfoot>\n";
                    }
                    template += indent + "</table>\n";
                    bodyClassDone = true;
                }

                parentIsArray = true;
            } else if (jClass.isObject && jClass.parent !== null && !jClass.parent.isArray) {
                template += indent + "<h3>" + jClass.name + "</h3>\n";
            }

            indent = "";
            for (i = 0; i < jClass.elements.length; i++) {
                element = jClass.elements[i];

                if (element.isObject) {
                    if (this.isNonObjectArray(element)) {
                        if (this.useTable) {
                            template += indent + currentIndent + "<td>\n";
                        }
                        template += indent + currentIndent + "<div><span class='col-lg-5'>" + element.oriName + ":</span></div>\n";
                        template += indent + currentIndent + "<ul>\n";
                        template += indent + currentIndent + "<% _(" + element.name + ").each(function(value) { %>\n";
                        template += indent + currentIndent + "    <li> <%= value %></li>\n";
                        template += indent + currentIndent + "<% }); %>\n";
                        template += indent + currentIndent + "</ul>\n";
                        if (this.useTable) {
                            template += indent + currentIndent + "</td>\n";
                        }
                    }
                    else if (jClass.parent !== null && jClass.parent.isArray)
                    {
                        if (this.useTable) {
                            template += indent + "    <td class='" + jClass.name + "_" + element.name + "_body'></td>\n";
                        }
                        else {
                            template += indent + "    <div class='" + jClass.name + "_" + element.name + "_body'></div>\n";
                        }
                        bodyClassDone = true;
                    }
                } else if (element.hasNoName) {
                    // ['asdf','adfasf'] elements that does not have name, todo, need to check if [ {}, {} ] will come here...
                    template += indent + currentIndent + "<% _(myData).each(function(value) { %>\n";
                    template += indent + currentIndent + "<p> <%= value %></p>\n";
                    template += indent + currentIndent + "<% }); %>\n";

                } else if (jClass.parent !== null && jClass.parent.isArray) {
                    if (!this.useTable) {
                        //todo: seems like we might need another template here
                        template += indent + "<div class='media-body'><p><%=" + this.getElementNameForTemplateEval(element) + "%></p></div>\n";
                    } else {
                        if (isCrud) {
                            template += indent + currentIndent + currentIndent + "<td>\n";
                            template += indent + currentIndent + currentIndent + currentIndent + "<% if(!isEdit) { %>\n";
                            template += indent + currentIndent + currentIndent + currentIndent + "<span><%= " + this.getElementNameForTemplateEval(element) + "%></span>\n";
                            template += indent + currentIndent + currentIndent + currentIndent + "<% } else { %>\n";
                            template += indent + currentIndent + currentIndent + currentIndent + "<input type='text' class='" + jClass.name + "_" + element.name + "' value='<%= " + this.getElementNameForTemplateEval(element) + "%>' />\n";
                            template += indent + currentIndent + currentIndent + currentIndent + "<% } %>\n";
                            template += indent + currentIndent + currentIndent + "</td>\n";
                        } else {
                            template += indent + currentIndent + currentIndent + "<td><span><%= " + this.getElementNameForTemplateEval(element) + "%></span></td>\n";
                        }
                    }
                } else {
                    template += indent + currentIndent + "<div><span class='col-lg-5'>" + element.oriName + ":</span><span class='col-lg-5'><%=" + this.getElementNameForTemplateEval(element) + "%></span></div>\n";
                }
            }

            if (jClass.parent !== null && jClass.parent.isArray) {
                if (this.useTable) {
                    if (isCrud) {
                        template += indent + currentIndent + currentIndent + "<td>\n";
                        template += indent + currentIndent + currentIndent + currentIndent +
                            "<button class='btn btn-primary btn-sm editTextButton'><%= editText%></button>\n";
                        template += indent + currentIndent + currentIndent + currentIndent +
                            "<button class='btn btn-primary btn-sm deleteButton'>X</button>\n";
                        template += indent + currentIndent + currentIndent + "</td>\n";
                    }
                }
            }

            if (!bodyClassDone) {
                template += indent + "    <div class='" + jClass.name + "_body'></div>\n";
            }

            if (template !== "") {
                template = templateHeader + template;
                template += indent + "</script>\n";

                this.templateHtmlList.push(template);
            }
        },

        getElementNameForTemplateEval: function (element) {
            if (element.hasSpecialName()) {
                this.usedSpecialKeyName = true;
                return 'GetJsonDataValue(arguments[0], "' + element.oriName + '")';
            }
            return element.name;
        },

        getElementName: function (element) {
            if (element.hasSpecialName()) {
                return '"' + element.oriName + '"';
            }
            return element.name;
        },

        pageDisplayTemplate: "\u003c!DOCTYPE html\u003e\n\u003chtml\u003e\n\u003chead\u003e\n        \u003cscript type=\"text/javascript\" src=\"/Scripts/jquery-1.9.1.js\"\u003e\u003c/script\u003e\n    \u003cscript type=\u0027text/javascript\u0027 src=\u0027//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js\u0027\u003e\u003c/script\u003e\n    \u003cscript type=\u0027text/javascript\u0027 src=\u0027//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.0/backbone-min.js\u0027\u003e\u003c/script\u003e\n    \u003cscript type=\u0027text/javascript\u0027 src=\u0027/Scripts/bootstrap.min.js\u0027\u003e\u003c/script\u003e\n    \u003clink rel=\"Stylesheet\" href=\"/Content/bootstrap.css\" /\u003e\n    {{headtags}}\n\u003c/head\u003e\n    \u003cbody class=\" \"\u003e\n        {{html}}\n        \u003cscript type=\u0027text/javascript\u0027\u003e\n            {{javascript}}\n        \u003c/script\u003e\n    \u003c/body\u003e\n\u003c/html\u003e",
        handleChildIframeUrlNotification: function (loc) {
            this.pageDisplayViewModel.urlToDisplay = loc;
        },
        createRunnablePageUrl: "/api/runnablepage",
        fetchRunnablePageUrl: "/home/runnablepage",

        showSpinner: function (isShow) {
            return false;
        }, //todo
        urlToDisplay: "",

        refresh: function (headContent, htmContent, jsContent) {
            var self = this;
            this.showSpinner(true);
            var content = this.pageDisplayTemplate.replace("{{headtags}}", headContent || "")
                .replace("{{html}}", htmContent).replace("{{javascript}}", jsContent);

            $.post(this.createRunnablePageUrl, '=' + encodeURIComponent(content), function (id) {
                self.set("runnablePageUrl", self.fetchRunnablePageUrl + "?id=" + id.replace(/"/g, ''));

                setTimeout(function () {
                    self.showSpinner(false);
                }, 300);
            }, "text");
        }
    });

    var AppView = Backbone.View.extend({
        el: $("#mainDiv"),
        events: {
            'click #jsonUrlButtonClick': 'jsonUrlButtonClick',
            'click #useTable': 'useTableOnCheck',
            'change #useCRUD': 'useCRUDOnCheck',
            'click #useData': 'useDataOnCheck',
            'click #scaffoldGetClick': 'scaffoldGetClick',
            'change #sampleUrls-selector': 'chosenSampleUrlOnChange',
            'focusout #jsonText': 'jsonTextOnFocusOut',
            'focusout #jsonUrl': 'jsonUrlOnFocusOut',
        },

        initialize: function () {
            var listUrls = jsonSample.GetJsonSampleList();
            var urls = [];
            for (var i = 0; i < listUrls.length; i++) {
                urls.push({ name: listUrls[i] });
            }

            this.sampleUrlsCollection = new Backbone.Collection(urls);

            var sampleUrls_select_template = _.template($("#sampleUrls_select_template").html(), {
                sampleUrls: this.sampleUrlsCollection.toJSON()
            });
            $('#sampleUrls-container').html(sampleUrls_select_template);

            this.renderNonModel();
            this.SampleUrlSelect = $("#sampleUrls-selector");

            this.listenTo(this.model, 'change', this.render);
        },

        renderNonModel: function () {
            $('#useTable').prop('checked', this.model.useTable);
            $('#useCRUD').prop('checked', this.model.useCRUD);
            $('#useData').prop('checked', this.model.useData);

            $('#generatedHtml').val(this.model.scaffoldHtml);
            $('#generatedJs').val(this.model.scaffoldJS);

            $('#errorMessage').val(this.model.errorMessage);

            $('#jsonText').val(this.model.jsonText);
            $('#jsonUrl').val(this.model.jsonUrl);

            this.htmlEditor.doc.setValue(this.model.htm);
            this.jsEditor.doc.setValue(this.model.js);

            return this;
        },

        render: function () {
            $('#runnablePageUrl').attr('src', this.model.get("runnablePageUrl"));
            return this;
        },

        jsonUrlOnFocusOut: function () {
            this.model.jsonUrl = $('#jsonUrl').val();
        },

        jsonTextOnFocusOut: function () {
            this.model.jsonText = $('#jsonText').val();
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        scaffoldGetClick: function () {
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        jsonUrlButtonClick: function () {
            this.GetWebUrlData();
        },

        GetWebUrlData: function () {
            var self = this;
            if (this.model.jsonUrl[0] === '/') {
                this.model.jsonUrlType = "json";
            } else {
                this.model.jsonUrlType = "jsonp";
            }
            dataModel.ajaxRequest("GET", this.model.jsonUrl, null, this.model.jsonUrlType)
                .done(function (data) {
                    self.model.jsonText = formatJson(data);
                    self.model.scaffoldGetClick();
                    self.renderNonModel();
                })
                .fail(function (xhr) {
                    if (self.model.jsonUrlType == "jsonp") {
                        // default webapi doesn't support jsonp formatter, try json just in case it works
                        dataModel.ajaxRequest("GET", self.model.jsonUrl, null, "json")
                            .done(function (data) {
                                self.model.jsonText = formatJson(data);
                                self.model.jsonUrlType = "json";
                                self.model.scaffoldGetClick();
                                self.renderNonModel();
                            })
                            .fail(function (xhr1) {
                                self.model.errorMessage = "GET/json/jsonp failed for " + this.jsonUrl;
                            });
                    } else {
                        self.model.errorMessage = "GET/json failed for " + this.jsonUrl;
                    }
                });
        },

        chosenSampleUrlOnChange: function () {
            this.model.errorMessage = null;
            this.model.jsonUrl = this.SampleUrlSelect.val();

            if (this.model.isUsingRemoteUrl()) {
                this.GetWebUrlData();
                return;
            }

            this.model.jsonText = formatJson(jsonSample.GetJsonValue(this.model.jsonUrl));
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        jsonTextOnBlur: function () {
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        useDataOnCheck: function () {
            this.model.useData = $('#useData').is(':checked');
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        useTableOnCheck: function () {
            this.model.useTable = $('#useTable').is(':checked');
            if (this.model.useCRUD && !this.model.useTable) {
                this.model.useCRUD = false;
            }
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        useCRUDOnCheck: function () {
            this.model.useCRUD = $('#useCRUD').is(':checked');
            if (this.model.useCRUD && !this.model.useTable) {
                this.model.useTable = true;
            }
            this.model.scaffoldGetClick();
            this.renderNonModel();
        },

        htmlEditor: CodeMirror.fromTextArea(document.getElementById('generatedHtml'), {
            mode: 'text/html',
            tabMode: 'indent'
        }),

        jsEditor: CodeMirror.fromTextArea(document.getElementById('generatedJs'), {
            mode: 'text/javascript',
            tabMode: 'indent'
        }),
    });

    var app = new AppView({ model: new AppModel() });
});
