using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Cors;

namespace SPAScaffold.Controllers
{
    public class Group
    {
        public int Id { get; set; }
        public string GroupName { get; set; }
        public List<Person> GroupMemeber { get; set; }
    }
    
    [EnableCors("*", "*", "*")]
    public class DoubleListsController : ApiController
    {
        List<Group> groups = new List<Group>();

        public DoubleListsController()
        {
            int personIdCount = 0;
            for (int j = 0; j < 3; j++)
            {
                Group group = new Group()
                {
                    Id = j,
                    GroupName = string.Format("My FirstGroup{0}", j),
                    GroupMemeber = new List<Person>()
                };
                for (int i = 0; i < 3; i++)
                {
                    group.GroupMemeber.Add(new Person()
                    {
                        Id = personIdCount,
                        FirstName = string.Format("My FirstName{0}", personIdCount),
                        LastName = string.Format("My LastName{0}", personIdCount),
                        BirthDate = DateTime.Now.Subtract(TimeSpan.FromDays(365 * (20 + personIdCount))),
                        Email = string.Format("My Email{0}", personIdCount)
                    });
                    personIdCount++;
                }

                groups.Add(group);
            }
        }

        // GET api/doublelists
        public IEnumerable<Group> Get()
        {
            return groups;
        }

        // GET api/doublelists/5
        public Group Get(int id)
        {
            return groups[id];
        }

        // POST api/doublelists
        public void Post(Person value)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("post {0}", value.FirstName));
        }

        // PUT api/doublelists/5
        public void Put(int id, Person value)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("put {0}", value.FirstName));
        }

        // DELETE api/doublelists/5
        public void Delete(int id)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("delete {0}", id));
        }
    }
}
