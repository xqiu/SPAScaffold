/// <reference path="jsonSamples.js" />
/// <reference path="../knockout-2.3.0.debug.js" />
/// <reference path="app.datamodel.js" />
/// <reference path="json.datamodel.js" />

ko.bindingHandlers.bindIframe = {
    init: function (element, valueAccessor) {
        function bindIframe() {
            try {
                var iframeInit = element.contentWindow.initChildFrame,
                    iframedoc = element.contentDocument.body;
            } catch (e) {
                // ignored
            }
            if (iframeInit)
                iframeInit(ko, valueAccessor());
            else if (iframedoc) {
                var div = document.createElement('div');
                div.setAttribute('data-bind', 'html: $data');
                iframedoc.appendChild(div);

                ko.applyBindings(valueAccessor(), iframedoc);
            }
        };
        bindIframe();
        ko.utils.registerEventHandler(element, 'load', bindIframe);
    }
};

ko.bindingHandlers.navigateIframeTo = {
    update: function (element, valueAccessor) {
        var url = ko.utils.unwrapObservable(valueAccessor()) || "about:blank",
            doc = element.contentWindow ? element.contentWindow :
                element.contentDocument.document ? element.contentDocument.document : element.contentDocument;
        doc.location.replace(url)
    }
};

function AppViewModel(dataModel) {
    var self = this;

    var listUrls = jsonSample.GetJsonSampleList();

    self.jsonText = ko.observable();
    self.jsonUrl = ko.observable("");
    self.jsonUrlType = "jsonp";
    self.sampleUrls = ko.observableArray(listUrls);
    self.scaffoldHtml = ko.observable();
    self.scaffoldJS = ko.observable();
    self.sampleFinalHtml = ko.observable();
    self.useTable = ko.observable(true);
    self.useCRUD = ko.observable(true);
    self.useData = ko.observable(true);
    self.chosenSampleUrls = ko.observableArray();

    self.errorMessage = ko.observableArray();

    self.jsonUrlButtonClick = function () {
        self.errorMessage(null);
        GetWebUrlData();
    };

    function GetWebUrlData() {
        if (self.jsonUrl()[0] === '/') {
            self.jsonUrlType = "json";
        }
        else {
            self.jsonUrlType = "jsonp";
        }
        dataModel.ajaxRequest("GET", self.jsonUrl(), null, self.jsonUrlType)
            .done(function (data) {
                var jsontext = formatJson(data);
                self.jsonText(jsontext);
            })
            .fail(function (xhr) {
                if (self.jsonUrlType == "jsonp") {
                    // default webapi doesn't support jsonp formatter, try json just in case it works
                    dataModel.ajaxRequest("GET", self.jsonUrl(), null, "json")
                        .done(function (data) {
                            var jsontext = formatJson(data);
                            self.jsonText(jsontext);
                            self.jsonUrlType = "json";
                        })
                        .fail(function (xhr1) {
                            self.errorMessage("GET/json/jsonp failed for " + self.jsonUrl());
                        });
                }
                else {
                    self.errorMessage("GET/json failed for " + self.jsonUrl());
                }
            });

    }

    self.isUsingRemoteUrl = function () {
        var url = self.jsonUrl().toLowerCase();
        return (url.indexOf('http') == 0 || url.indexOf('/') == 0);
    };

    self.isGeneratingDataLayer = function () {
        return self.useData() && self.isUsingRemoteUrl();
    }

    self.chosenSampleUrls.subscribe(function () {
        self.errorMessage(null);
        self.jsonUrl(self.chosenSampleUrls()[0]);

        if (self.isUsingRemoteUrl()) {
            GetWebUrlData();
            return;
        }

        self.jsonText(formatJson(jsonSample.GetJsonValue(self.jsonUrl())));
    });

    self.jsonClasses = ko.observableArray();
    self.jItem = ko.observable();

    self.jsonText.subscribe(function () {
        self.scaffoldGetClick();
    });

    self.useData.subscribe(function () {
        self.scaffoldGetClick();
    });

    self.useTable.subscribe(function () {
        if (self.useCRUD() && !self.useTable()) {
            self.useCRUD(false);
            return;
        }
        self.scaffoldGetClick();
    });

    self.useCRUD.subscribe(function () {
        if (self.useCRUD() && !self.useTable()) {
            self.useTable(true);
            return;
        }
        self.scaffoldGetClick();
    });

    self.htm = "";
    self.js = "";
    self.usedSpecialKeyName = false;
    self.sampleFinalHtml("");

    self.htmlEditor = CodeMirror.fromTextArea(document.getElementById('generatedHtml'), {
        mode: 'text/html',
        tabMode: 'indent'
    });
    self.jsEditor = CodeMirror.fromTextArea(document.getElementById('generatedJs'), {
        mode: 'text/javascript',
        tabMode: 'indent'
    });

    self.scaffoldGetClick = function () {
        self.htm = "";
        self.js = "";
        self.usedSpecialKeyName = false;
        self.sampleFinalHtml("");
        self.errorMessage(null);

        if (!self.isUsingRemoteUrl() && self.useData()) {
            self.errorMessage("Not using remote url, thus not generating data layer");
        }

        var data = self.jsonText()
        if (data == null) {
            return;
        }
        var jData;
        try {
            jData = $.parseJSON(data);
        }
        catch (ex) {
            self.errorMessage(ex.message);
        }
        if (jData == null) {
            self.errorMessage("Cannot parse Json");
            return;
        }

        self.jsonClasses.removeAll();
        self.jItem(null);
        self.jItem(new jsonItem("rootObject", jData, self.jsonClasses(), null));

        GenerateJavaScript(jData);
        GenerateHtml();

        self.htmlEditor.doc.setValue(self.htm);
        self.jsEditor.doc.setValue(self.js);

        headContent = "";
        self.pageDisplayViewModel.refresh(headContent, self.htm, self.js)
    };

    function GenerateJavaScript(data) {
        if (self.isGeneratingDataLayer()) {
            self.js += generateAppDataModel();
        }
        else {
            self.js += "var myData = " + formatJson(data) + ";\n";
        }
        var jstext = "";

        for (var i = 0; i < self.jsonClasses().length - 1; i++) {
            var item = self.jsonClasses()[i];
            jstext += "function " + item.getClassName() + "(data, parent";
            if (self.useData() && self.isUsingRemoteUrl()) {
                jstext += ", dataModel";
            }
            jstext += ") {\n";
            jstext += GenerateJsItemInternal(item);
            jstext += "}\n";
        }

        if (self.isGeneratingDataLayer()) {
            jstext += "function AppViewModel(dataModel) {\n";
        }
        else {
            jstext += "function AppViewModel(data) {\n";
        }

        if (self.jsonClasses().length == 0 && self.jItem().childrenUnNamed && self.jItem().isArray) {
            jstext += "    var self=this;\n";
            jstext += "    self.rootObject = ko.observable(data);\n";
            if (self.isGeneratingDataLayer()) {
                jstext += "    self.dataModel = dataModel;\n";
            }
        }
        else {
            jstext += GenerateJsItemInternal(self.jItem());
        }
        jstext += "}\n";

        if (self.isGeneratingDataLayer()) {
            jstext += "ko.applyBindings(new AppViewModel(new AppDataModel()));\n";
        }
        else {
            jstext += "ko.applyBindings(new AppViewModel(myData));\n";
        }

        self.js += jstext;

        if (self.usedSpecialKeyName) {
            self.js += jasonGetValueConst;
        }

        self.scaffoldJS(self.js);
    }

    function generateAppDataModel() {
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
        text += "    self.ajaxRequest = function (type, url, data, dataType) {\n";
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

        var url = self.jsonUrl().trim();
        if (url[url.length - 1] != '/') {
            if (self.jsonUrlType == "json") {
                url += '/';
            }
        }
        else {
            if (self.jsonUrlType == "jsonp") {
                url[url.length - 1] = ' ';
                url = url.trim();
            }
        }
        text += "    self.rootUrl = '" + url + "';\n";
        text += "    self.getListRootObject = function () {\n";
        text += '        return self.ajaxRequest("GET", self.rootUrl, null, "' + self.jsonUrlType + '");\n';
        text += "    };\n";
        for (var i = 0; i < self.jsonClasses().length; i++) {
            var item = self.jsonClasses()[i];
            if (item.parent != null && item.parent.isArray) {
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
                    text += "    self.getList" + item.getClassName() + " = function () {\n";
                    text += '        return self.ajaxRequest("GET", self.rootUrl, null, "' + self.jsonUrlType + '");\n';
                    text += "    };\n";
                    text += "    self.delete" + item.getClassName() + " = function (data) {\n";
                    text += '        return self.ajaxRequest("DELETE", self.rootUrl + data.' + keyName + '(), null, "' + self.jsonUrlType + '");\n';
                    text += "    };\n";
                    text += "    self.update" + item.getClassName() + " = function (data) {\n";
                    text += '        return self.ajaxRequest("PUT", self.rootUrl + data.' + keyName + '(), data, "' + self.jsonUrlType + '");\n';
                    text += "    };\n";
                    text += "    self.new" + item.getClassName() + " = function (data) {\n";
                    text += '        return self.ajaxRequest("POST", self.rootUrl, data, "' + self.jsonUrlType + '");\n';
                    text += "    };\n";
                }
            }
        }

        text += "}\n";
        return text;
    }

    function GenerateJsItemInternal(item) {
        var jstext = "";
        jstext += "    var self=this;\n";

        if (self.isGeneratingDataLayer()) {
            jstext += "    self.dataModel = dataModel;\n";
        }

        //object null check, as null is valid for json object
        if (!item.childrenUnNamed) {
            if (self.isGeneratingDataLayer() && item.name === "rootObject") {
            }
            else {
                jstext += GetCheckNullHtml(item);
            }
        }

        var dataInitText = "";
        var addAndEditItemText = "";
        for (var j = 0; j < item.elements.length; j++) {
            var element = item.elements[j];

            if (element.name === "rootObject_item" && item.name === "rootObject" && item.isArray) {
                jstext += "    self.rootObject = ko.observableArray()\n";
                dataInitText += GetEachCode(element, "rootObject", "RootObject_item", true);

                if (self.useCRUD()) {
                    addAndEditItemText += GetAddAndEditItemCode(item.name, "RootObject_item");
                }
                continue;
            }

            jstext += "    self." + element.name + " = ";
            if (element.isArray) {
                jstext += "ko.observableArray(";

                dataInitText += GetEachCode(element, element.name, element.elements[0].getClassName(), false);

                if (self.useCRUD()) {
                    addAndEditItemText += GetAddAndEditItemCode(element.name, element.elements[0].getClassName());
                }
            }
            else {
                jstext += "ko.observable("

                if (self.isGeneratingDataLayer() && item.name === "rootObject") {
                    dataInitText += "    self." + element.name + "(";
                    if (element.isObject) {
                        dataInitText += "new " + element.getClassName() + "(";
                    }

                    if (element.hasSpecialName()) {
                        self.usedSpecialKeyName = true;
                        dataInitText += 'GetJsonDataValue(data, "' + element.oriName + '")';
                    }
                    else {
                        dataInitText += "data." + element.name;
                    }

                    if (element.isObject) {
                        dataInitText += ', self, self.dataModel)';
                    }
                    dataInitText += ");\n";
                }
                else {
                    if (element.isObject) {
                        jstext += "new " + element.getClassName() + "(";
                    }
                    if (element.hasSpecialName()) {
                        self.usedSpecialKeyName = true;
                        jstext += 'GetJsonDataValue(data, "' + element.oriName + '")';
                    }
                    else {
                        jstext += "data." + element.name;
                    }

                    if (element.isObject) {
                        jstext += ')';
                    }
                }
            }

            jstext += ");\n";
        }

        if (self.isGeneratingDataLayer() && item.name === "rootObject") {
            jstext += "    self.dataModel.getListRootObject().done(function (data) {\n";
            dataInitText = "    " + dataInitText.replace(/\n\s\s\s\s/g, "\n        ");
        }
        jstext += dataInitText;
        if (self.isGeneratingDataLayer() && item.name === "rootObject") {
            jstext += "    }).fail(function (msg) {\n";
            jstext += "        console.log('Get failed: ' + JSON.stringify(msg.responseText));\n";
            jstext += "    });\n";
        }

        if (self.useCRUD()) {
            jstext += addAndEditItemText;
        }

        if (self.useCRUD() && item.parent != null && item.parent.isArray) {
            jstext += GetEditItemCode(item.parent.name, item.getClassName());

            jstext += "    self.toJson = function () {\n";
            jstext += "    return JSON.stringify({\n";
            for (var i = 0; i < item.elements.length; i++) {
                jstext += "        " + item.elements[i].name + ": self." + item.elements[i].name + "()";
                if (i < item.elements.length - 1) {
                    jstext += ",";
                }
                jstext += "\n";
            }
            jstext += "    });\n";
            jstext += "};\n";
        }

        return jstext;
    }

    function GetCheckNullHtml(item) {
        var text = "";
        text += "    if (data == null) {\n";
        text += "        data = {";

        for (var j = 0; j < item.elements.length; j++) {
            var element = item.elements[j];
            text += '"' + element.name + '" : ""';
            if (j < item.elements.length - 1) {
                text += ",";
            }
        }
        text += "}\n    }\n";
        return text;
    }

    function GetEachCode(element, parentElementName, childClassName, isRootArray) {
        var dataInitText = "";
        var newIdent = "";
        var myElement = element;
        if (!isRootArray) {
            myElement = element.elements[0];
        }

        if (isRootArray) {
            dataInitText += newIdent + "    $.each(data, function (key, value) {\n";
        }
        else {
            dataInitText += newIdent + "    $.each(data." + parentElementName + ", function (key, value) {\n";
        }

        if (myElement.hasNoName && !myElement.isObject) {
            dataInitText += newIdent + "        self." + parentElementName + ".push(value);\n";
            dataInitText += newIdent + "    });\n";
        } else {
            dataInitText += newIdent + "        self." + parentElementName + ".push(new " + childClassName + "(value, self";
            if (self.isGeneratingDataLayer()) {
                dataInitText += ", self.dataModel";
            }
            dataInitText += "));\n";
            dataInitText += newIdent + "    });\n";
        }

        return dataInitText;
    }

    function GetAddAndEditItemCode(parentElementName, childClassName) {
        var text = "";
        text += "    self.addAndEditItem = function () {\n";
        text += "        var item = new " + childClassName + "(null, self";
        if (self.isGeneratingDataLayer()) {
            text += ", self.dataModel";
        }
        text += ");\n";

        text += "        item.isNew = true;\n";
        text += "        self." + parentElementName + ".push(item);\n";
        text += "        item.showEditItem();\n";
        text += "    };\n";
        return text;
    }

    function GetEditItemCode(parentName, elmentClassName) {
        var text = "";
        text += "    self.isEdit = ko.observable(false);\n";
        text += "    self.editText = ko.observable('edit');\n";
        text += "    self.parent = parent;\n";
        text += "    self.isNew = false;\n";
        text += "    self.showEditItem = function () {\n";
        text += "        if (self.isEdit()) {\n";
        text += "            self.isEdit(false);\n";
        text += "            self.editText('edit');\n";

        if (self.isGeneratingDataLayer()) {
            text += "            if (self.isNew) {\n";
            text += "                self.dataModel.new" + elmentClassName + "(self)\n";
            text += "                    .done(function (data) {\n";
            text += "                        self.isNew = false;\n";
            text += "                    })\n";
            text += "                    .fail(function (msg) {\n";
            text += "                        console.log('Create failed: ' + JSON.stringify(msg.responseText));\n";
            text += "                    });\n";
            text += "            }\n";
            text += "            else {\n";
            text += "                self.dataModel.update" + elmentClassName + "(self)\n";
            text += "                    .done(function (data) { })\n";
            text += "                    .fail(function (msg) {\n";
            text += "                        console.log('Update failed: ' + JSON.stringify(msg.responseText));\n";
            text += "                    });\n";
            text += "            }\n";
        }

        text += "        }\n";
        text += "        else {\n";
        text += "            self.isEdit(true);\n";
        text += "            self.editText('save');\n";
        text += "        }\n";
        text += "    };\n";
        text += "    self.deleteItem = function () {\n";
        if (self.isGeneratingDataLayer()) {
            text += "        self.dataModel.delete" + elmentClassName + "(self)\n";
            text += "            .done(function (data) {\n";
            text += "                 self.parent." + parentName + ".remove(self);\n";
            text += "            })\n";
            text += "            .fail(function (msg) {\n";
            text += "                console.log('Delete failed: ' + JSON.stringify(msg.responseText));\n";
            text += "            });\n";
        }
        else {
            text += "        self.parent." + parentName + ".remove(self);\n";
        }
        text += "    }\n";
        return text;
    }

    function GenerateHtml() {
        self.htm += "<div>\n";

        if (self.jsonClasses().length > 0) {
            generateItemTemplate(self.jsonClasses()[self.jsonClasses().length - 1], false, "");
        }
        else {
            if (self.jItem().childrenUnNamed) {
                self.htm += "<ul class='media-list' data-bind='foreach: " + self.jItem().name + "'>\n";
                self.htm += "    <li class='media'><div class='media-body'><p data-bind='text: " + "$data" + "'></p></div></li>\n";
                self.htm += "</ul>\n";
            }
        }

        self.htm += "</div>"

        self.scaffoldHtml(self.htm);
    }

    function generateItemTemplate(jClass, isParentIsArray, indent) {
        var currentIndent = "    ";
        var parentIsArray = false;

        var isCrud = false;
        if (self.useCRUD()) {
            isCrud = true;
            if (jClass.isArray && jClass.elements.length == 1 && jClass.elements[0].hasNoName && !jClass.elements[0].isObject) {
                isCrud = false;
            }
        }

        if (jClass.isArray && jClass.elements.length == 0) {
            //empty array, we can't do anything
            return;
        }

        if (jClass.isArray) {
            if (!self.useTable()) {
                self.htm += indent + "<ul class='media-list' data-bind='foreach: " + jClass.name + "'>\n";
            }
            else {
                self.htm += indent + "<table class='table'>\n";
                self.htm += indent + currentIndent + "<thead>\n";
                self.htm += indent + currentIndent + currentIndent + "<tr>\n";

                for (var i = 0; i < jClass.elements.length; i++) {
                    var element = jClass.elements[i];
                    if (element.isObject) {
                        var subElements = element.elements;
                        for (var j = 0; j < subElements.length; j++) {
                            if (!subElements[j].hasNoName) {
                                self.htm += indent + currentIndent + currentIndent + currentIndent + "<th>" + subElements[j].name + "</th>\n";
                            }
                        }
                    }
                    else if (element.hasNoName) {
                    }
                    else {
                        self.htm += indent + currentIndent + currentIndent + currentIndent + "<th data-bind='text: " + element.name + "'></th>\n";
                    }
                }

                self.htm += indent + currentIndent + currentIndent + "</tr>\n";
                self.htm += indent + currentIndent + "</thead>\n";


                if (isCrud) {
                    self.htm += indent + currentIndent + "<tbody>\n";
                    self.htm += indent + currentIndent + "<!--ko foreach: " + jClass.name + "-->\n";
                }
                else {
                    self.htm += indent + currentIndent + "<tbody data-bind='foreach: " + jClass.name + "'>\n";
                }
                self.htm += indent + currentIndent + currentIndent + "<tr>\n";
            }
            parentIsArray = true;
        }
        else if (jClass.isObject && jClass.parent != null && !jClass.parent.isArray) {
            self.htm += indent + "<h3>" + jClass.name + "</h3>\n";
            self.htm += indent + "<div data-bind='with: " + jClass.name + "'>\n";
        }

        for (var i = 0; i < jClass.elements.length; i++) {
            var element = jClass.elements[i];

            if (element.isObject) {
                var newIndent = indent + currentIndent;
                if (isParentIsArray) {
                    if (!self.useTable()) {
                        self.htm += indent + "<li class='media'><div class='media-body'>\n";
                    }
                    else {
                        newIndent += currentIndent;
                        self.htm += newIndent + "<td>\n";
                    }
                }
                generateItemTemplate(element, parentIsArray, newIndent);
                if (isParentIsArray) {
                    if (!self.useTable()) {
                        self.htm += indent + "</div></li>\n";
                    }
                    else {
                        self.htm += newIndent + "</td>\n";
                    }
                }
            }
            else if (element.hasNoName) {
                if (!self.useTable()) {
                    self.htm += indent + currentIndent + "<li class='media'><div class='media-body'><p data-bind='text: " + "$data" + "'></p></div></li>\n";
                }
                else {
                    self.htm += indent + currentIndent + currentIndent + "<td><span data-bind='text: " + "$data" + "'></span></td>\n";
                }
            }
            else if (jClass.parent != null && jClass.parent.isArray) {
                if (!self.useTable()) {
                    self.htm += indent + "<li class='media'><div class='media-body'><p data-bind='text: " + element.name + "'></p></div></li>\n";
                }
                else {
                    if (isCrud) {
                        self.htm += indent + currentIndent + currentIndent + "<td>\n";
                        self.htm += indent + currentIndent + currentIndent + currentIndent + "<span data-bind='text: " + element.name + ", visible: !isEdit()'></span>\n";
                        self.htm += indent + currentIndent + currentIndent + currentIndent + "<input type='text' data-bind='value: " + element.name + ", visible: isEdit' />\n";
                        self.htm += indent + currentIndent + currentIndent + "</td>\n";
                    } else {
                        self.htm += indent + currentIndent + currentIndent + "<td><span data-bind='text: " + element.name + "'></span></td>\n";
                    }
                }
            }
            else {
                self.htm += indent + currentIndent + "<div><span class='col-lg-5'>" + element.oriName + ":</span>" + "<span class='col-lg-5' data-bind='text: " + element.name + "'></span></div>\n";
            }

        }

        if (jClass.isArray) {
            if (!self.useTable()) {
                self.htm += indent + "</ul>\n";
            }
            else {
                if (isCrud) {
                    self.htm += indent + currentIndent + currentIndent + currentIndent + "<td>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + currentIndent +
                        "<button class='btn btn-primary btn-sm' data-bind='click: showEditItem, text: editText'></button>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + currentIndent +
                        "<button class='btn btn-primary btn-sm' data-bind='click: deleteItem'>X</button>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + "</td>\n";
                }

                self.htm += indent + currentIndent + currentIndent + "</tr>\n";

                if (isCrud) {
                    self.htm += indent + currentIndent + "<!-- /ko -->\n";

                    self.htm += indent + currentIndent + currentIndent + "<tr>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + "<td>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + currentIndent +
                        "<button class='btn btn-primary btn-lg' data-bind='click: addAndEditItem'>Add new row</button>\n";
                    self.htm += indent + currentIndent + currentIndent + currentIndent + "</td>\n";
                    self.htm += indent + currentIndent + currentIndent + "</tr>\n";

                    self.htm += indent + currentIndent + "</tbody>\n";
                } else {
                    self.htm += indent + currentIndent + "</tbody>\n";
                }
                self.htm += indent + "</table>\n";
            }
        }
        else if (jClass.isObject && jClass.parent != null && !jClass.parent.isArray) {
            self.htm += indent + "</div>\n";
        }
    }

    self.pageDisplayTemplate = "\u003c!DOCTYPE html\u003e\n\u003chtml\u003e\n\u003chead\u003e\n        \u003cscript type=\"text/javascript\" src=\"/Scripts/jquery-1.9.1.js\"\u003e\u003c/script\u003e\n    \u003cscript type=\u0027text/javascript\u0027 src=\u0027/Scripts/knockout-2.3.0.js\u0027\u003e\u003c/script\u003e\n    \u003cscript type=\u0027text/javascript\u0027 src=\u0027/Scripts/bootstrap.min.js\u0027\u003e\u003c/script\u003e\n    \u003clink rel=\"Stylesheet\" href=\"/Content/bootstrap.css\" /\u003e\n    {{headtags}}\n\u003c/head\u003e\n    \u003cbody class=\" \"\u003e\n        {{html}}\n        \u003cscript type=\u0027text/javascript\u0027\u003e\n            (function () { // Wrap in function to prevent accidental globals\n                if (location.protocol != \"data:\") {\n                    $(window).bind(\u0027hashchange\u0027, function () {\n                        window.parent.handleChildIframeUrlChange(location.hash) \n                    });\n                }\n\n                {{javascript}}\n            })();\n        \u003c/script\u003e\n    \u003c/body\u003e\n\u003c/html\u003e"
    self.handleChildIframeUrlNotification = function (loc) { self.pageDisplayViewModel.urlToDisplay(loc) };
    self.createRunnablePageUrl = "/api/runnablepage";
    self.fetchRunnablePageUrl = "/home/runnablepage";

    var supportDataProtocol = ko.dependentObservable(function () {
        return false;
    });

    self.pageDisplayViewModel = new window.pageDisplayViewModel(
        self.createRunnablePageUrl, self.fetchRunnablePageUrl, self.pageDisplayTemplate, supportDataProtocol);
}

window.pageDisplayViewModel = function (createRunnablePageUrl, fetchRunnablePageUrl, pageDisplayTemplate, supportDataProtocol) {
    var self = this;
    this.runnablePageUrl = ko.observable();
    this.runnablePageUrl.equalityComparer = function () { return false };
    this.canRunCode = ko.observable(true);
    this.showSpinner = ko.observable(false);
    this.urlToDisplay = ko.observable("");

    this.refresh = function (headContent, htmContent, jsContent) {
        this.showSpinner(true);
        var content = pageDisplayTemplate.replace("{{headtags}}", headContent || "")
            .replace("{{html}}", htmContent).replace("{{javascript}}", jsContent);
        if (supportDataProtocol()) {
            //this portion is not tested
            var dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(content);
            self.runnablePageUrl(dataUrl);
            setTimeout(function () { self.showSpinner(false) }, 300);
        } else {
            $.post(createRunnablePageUrl, '=' + encodeURIComponent(content), function (id) {
                self.runnablePageUrl(fetchRunnablePageUrl + "?id=" + id.replace(/"/g, ''));
                setTimeout(function () { self.showSpinner(false) }, 300)
            }, "text");
        }
    }
};

// activate knockout
var viewModel = new AppViewModel(new AppDataModel())
ko.applyBindings(viewModel);
window.handleChildIframeUrlChange = viewModel.handleChildIframeUrlNotification;
