using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UniRpc.WebApplication;

namespace dotnetweb.UniRpc
{

    public class Person
    {
        public string name { get; set; }
        public int get { get; set; }

    }

    // This is a generated service
    public abstract class SampleService: WebSocketServiceBase
    {

        public SampleService()
        {
            __name = "SampleService";
        }

        public virtual bool Test(Person person)
        {
            throw new NotImplementedException();
        }

        public override BaseMessage __invoke(BaseMessage message)
        {
            switch (message.Method)
            {
                case "Test":
                    {
                        // Deserialize Parameters
                        Person person = message.Payload.GetProperty<Person>("person");
                        return new BaseMessage()
                        {
                            Id = message.Id,
                            Payload = Test(person).AsElement()
                        };
                    }
            }
            return base.__invoke(message);
        }
    }

    
}
