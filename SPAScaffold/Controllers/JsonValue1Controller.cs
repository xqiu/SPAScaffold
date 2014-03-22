using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace SPAScaffold.Controllers
{
    public class JsonValue1Controller : ApiController
    {
        // GET api/jsonValue1
        public IEnumerable<TestStats> Get()
        {
            List<TestStats> stats = new List<TestStats>();
            stats.Add(new TestStats());

            return stats;
        }

        // GET api/jsonvalue1/5
        public TestStats Get(int id)
        {
            return new TestStats();
        }

        // POST api/jsonvalue1s
        public void Post([FromBody]string value)
        {
        }

        // PUT api/jsonvalue1s/5
        public void Put(int id, [FromBody]string value)
        {
        }

        // DELETE api/jsonvalue1s/5
        public void Delete(int id)
        {
        }
    }

    public class TestStats
    {
        public Dictionary<string, int> TestDict1 { get; set; }

        public Dictionary<string, string> TestDict2 { get; set; }

        public TestStats()
        {
            TestDict1 = new Dictionary<string, int>();
            TestDict1.Add("Test1", 1);
            TestDict1.Add("Test2", 2);

            TestDict2 = new Dictionary<string, string>();
            TestDict2.Add("Test2.test2a", "test2a value");
            TestDict2.Add("Test2.test2b", "test2b value");
        }
    }
}
