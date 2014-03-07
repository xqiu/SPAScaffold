using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Cors;

namespace SPAScaffold.Controllers
{
    public class Person
    {
        public int Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime BirthDate { get; set; }
        public string Email { get; set; }
    }
    
    [EnableCors("*", "*", "*")]
    public class ListsController : ApiController
    {
        List<Person> people = new List<Person>();

        public ListsController()
        {
            for (int i = 0; i < 3; i++)
            {
                people.Add(new Person()
                {
                    Id = i,
                    FirstName = string.Format("My FirstName{0}", i),
                    LastName = string.Format("My LastName{0}", i),
                    BirthDate = DateTime.Now.Subtract(TimeSpan.FromDays(365 * (20 + i))),
                    Email = string.Format("My Email{0}", i)
                });

            }
        }

        // GET api/lists
        public IEnumerable<Person> Get()
        {
            return people;
        }

        // GET api/lists/5
        public Person Get(int id)
        {
            return people[id];
        }

        // POST api/lists
        public void Post(Person value)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("post {0}", value.FirstName));
        }

        // PUT api/lists/5
        public void Put(int id, Person value)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("put {0}", value.FirstName));
        }

        // DELETE api/lists/5
        public void Delete(int id)
        {
            System.Diagnostics.Trace.TraceInformation(string.Format("delete {0}", id));
        }
    }
}
