using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web;
using System.Web.Hosting;
using System.Web.Http;

namespace SPAScaffold.Controllers
{
    public class RunnablePageController : ApiController
    {
        // POST api/runnablepage
        //[FromBody]
        public HttpResponseMessage Post([FromBody]string value)
        {
            //save value somewhere, and should return an Id
            //temp: let's write to a temp file in App_Data for now.
            string tempName = Guid.NewGuid().ToString();  
            string path = HostingEnvironment.MapPath("~/App_Data/" + tempName + ".txt");
            System.IO.File.WriteAllText(path, value);

            HttpResponseMessage response = Request.CreateResponse(HttpStatusCode.Created, tempName);
            //response.Headers.Location = new Uri(Url.Link("QuestionOwners", new { id = owner.Id }));
            
            return response;
        }

    }
}
