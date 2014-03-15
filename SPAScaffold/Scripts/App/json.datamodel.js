function jsonItem(name, value, jsonElements, parent) {
    /// <param name="name" type="String">json name</param>
    /// <param name="value" type="String">JSON value</param>
    /// <param name="jsonElements" type="String">global Json type Elements that we should not repeat ourselves</param>
    /// <param name="parent" type="String">parent jsonItem</param>
    var self = this;
    self.name = name;
    self.value = value;
    self.globalJsonElements = jsonElements;
    self.parent = parent;
    self.childrenUnNamed = false;
    self.hasNoName = false;
    self.oriName = name;

    self.isArray = function (data) {
        if (data instanceof Object) {
            if (data.length == undefined) {
                return false;
            }
            return true;
        }
        return false;
    }(value);

    self.isObject = function (data) {
        if (data instanceof Object) {
            return true;
        }
        return false;
    }(value);

    self.elements = [];
    
    self.getClassName = function () {
        var name = self.name;
        name = name.substr(0, 1).toUpperCase() + self.name.substr(1);
        return name;
    };

    self.hasSpecialName = function () {
        return self.name !== self.oriName;
    };

    self.checkRepeatItem = function (jsonElements) {
        var isRepeat = false;
        for (var i = 0; i < jsonElements.length; i++) {
            if (self.name === jsonElements[i].name) {
                isRepeat = true;
                addMissingElement(jsonElements[i]);
                break;
            }
        }
        return isRepeat;
    }

    if (self.isObject) {
        $.each(value, parseElementGet);

        if (!self.checkRepeatItem(self.globalJsonElements)) {
            if (!self.isArray || self.parent===null) {
                self.globalJsonElements.push(self);
            }
        }
    }

    function addMissingElement(jsonElement) {
        for (var j = 0; j < self.elements.length; j++) {
            var found = false;
            for (var k = 0; k < jsonElement.elements.length; k++) {
                if (self.elements[j].name === jsonElement.elements[k].name) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                jsonElement.elements.push(self.elements[j]);
            }
        }
    }

    function parseElementGet(key, value) {
        var hasNoName = false;
        var oriKey = key;
        if (!isNaN(key)) {
            // is a number, means the parent is an array of objects such as an array of string ['ab', '123'], 
            // so $.each function's key is a number
            if (self.name[self.name.length - 1] == 's') {
                key = self.name.substr(0, self.name.length - 1);
            }
            else {
                key = self.name + "_item";
            }
            self.childrenUnNamed = true;
            hasNoName = true;
        }
        else {
            if (key.indexOf(':') >= 0 || key.indexOf('-') >= 0) {
                key = key.replace(/[:-]/g, '_');
            }
        }

        var child = new jsonItem(key, value, self.globalJsonElements, self);
        child.hasNoName = hasNoName;
        child.oriName = oriKey;

        if (!child.checkRepeatItem(self.elements)) {
            self.elements.push(child);
        }
    }
    
    self.fullName = function () {
        return self.getParentName(this.name);
    }

    self.getParentName = function (name) {
        if (self.parent == null) {
            return name;
        }
        if (self.parent.name == "rootObject") {
            return "data." + name;
        }
        return self.parent.getParentName(self.parent.name + "." + name);
    }

    self.relativeName = function () {
        /// <return>get the relative name upto a parent that is at the top or is an array</return>
        return self.getParentRelativeName(this.name);
    }

    self.getParentRelativeName = function (name) {
        if (self.parent == null) {
            return "data." + name;
        }
        if (self.parent.name == "rootObject") {
            return "data." + name;
        }
        if (self.parent.isArray) {
            return self.parent.name + "." + name;
        }
        if (self.parent.hasNoName && (self.parent.parent != null) && self.parent.parent.isArray)
        {   // escape the parent's name, as noName item has to be within an array, and we'll just escape the naming for it
            return self.parent.parent.name + "." + name;
        }

        return self.parent.getParentRelativeName(self.parent.name + "." + name);
    }
}

var jasonGetValueConst = "function GetJsonDataValue(data, key) {\r    if (data instanceof Object)\r    {\r        return Object.getOwnPropertyDescriptor(data, key) != null ? Object.getOwnPropertyDescriptor(data, key).value : null;\r    }\r    return null;\r}";

function realTypeOf(data) {
    if (typeof data == "object") {
        if (data === null) return "null";
        if (data.constructor == (new Array).constructor) return "array";
        if (data.constructor == (new Date).constructor) return "date";
        if (data.constructor == (new RegExp).constructor) return "regex";
        return "object";
    }
    return typeof data;
}

function formatJson(data, indent) {
    return JSON.stringify(data, null, "    ");
};
