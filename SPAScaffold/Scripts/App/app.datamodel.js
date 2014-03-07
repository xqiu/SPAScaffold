function AppDataModel() {
    var self = this;

    function getSecurityHeaders() {
        var accessToken = sessionStorage["accessToken"] || localStorage["accessToken"];

        if (accessToken) {
            return { "Authorization": "Bearer " + accessToken };
        }

        return {};
    }

    // ajax helper
    self.ajaxRequest = function (type, url, data, dataType) {
        var options = {
            dataType: dataType || "json",
            contentType: "application/json",
            cache: false,
            type: type,
            data: data ? data.toJson() : null,
            headers: getSecurityHeaders()
        };
        return $.ajax(url, options);
    }

}
