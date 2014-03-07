using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Hosting;
using System.Web.Mvc;

namespace SPAScaffold.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult runnablepage(string id)
        {
            string path = HostingEnvironment.MapPath("~/App_Data/" + id + ".txt");
            if (System.IO.File.Exists(path))
            {
                string content = System.IO.File.ReadAllText(path);
                System.IO.File.Delete(path);
                return Content(content);
            }
            else
            {
                return HttpNotFound();
            }
        }
    }
}
