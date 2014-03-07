using System.Web;
using System.Web.Optimization;

namespace SPAScaffold
{
    public class BundleConfig
    {
        // For more information on bundling, visit http://go.microsoft.com/fwlink/?LinkId=301862
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.Add(new ScriptBundle("~/bundles/jquery").Include(
                        "~/Scripts/jquery-{version}.js"));

            // Use the development version of Modernizr to develop with and learn from. Then, when you're
            // ready for production, use the build tool at http://modernizr.com to pick only the tests you need.
            bundles.Add(new ScriptBundle("~/bundles/modernizr").Include(
                        "~/Scripts/modernizr-*"));

            bundles.Add(new ScriptBundle("~/bundles/bootstrap").Include(
                      "~/Scripts/bootstrap.js"));

            bundles.Add(new StyleBundle("~/Content/css").Include(
                      "~/Content/bootstrap.css",
                      "~/Content/site.css"));

            bundles.Add(new ScriptBundle("~/bundles/knockout").Include(
                "~/Scripts/knockout-{version}.js"
                ));

            bundles.Add(new ScriptBundle("~/bundles/knockoutScaffold").Include(
                "~/Scripts/App/app.datamodel.js",
                "~/Scripts/App/jsonSamples.js",
                "~/Scripts/App/json.datamodel.js",
                "~/Scripts/App/knockoutScaffold.js"
                ));

            bundles.Add(new ScriptBundle("~/bundles/AngularScaffold").Include(
                "~/Scripts/App/app.datamodel.js",
                "~/Scripts/App/jsonSamples.js",
                "~/Scripts/App/json.datamodel.js",
                "~/Scripts/App/AngularScaffold.js"
                ));

            bundles.Add(new ScriptBundle("~/bundles/BackboneUnderscoreScaffold").Include(
                "~/Scripts/underscore.js",
                "~/Scripts/backbone.js",
                "~/Scripts/App/app.datamodel.js",
                "~/Scripts/App/jsonSamples.js",
                "~/Scripts/App/json.datamodel.js",
                "~/Scripts/App/BackboneUnderscoreScaffold.js"
                ));

            bundles.Add(new StyleBundle("~/Content/codemirrorcss").Include(
                      "~/Content/codemirror.css",
                      "~/Content/jquery.splitter.css"
                ));

            bundles.Add(new ScriptBundle("~/bundles/codemirror").Include(
                "~/Scripts/codemirror.js",
                "~/Scripts/codemirrormode/xml/xml.js",
                "~/Scripts/codemirrormode/javascript/javascript.js",
                "~/Scripts/codemirrormode/css/css.js",
                "~/Scripts/codemirrormode/htmlmixed/htmlmixed.js",
                "~/Scripts/jquery.splitter-{version}.js",
                "~/Scripts/App/app.common.js"
                ));
            
        }
    }
}
