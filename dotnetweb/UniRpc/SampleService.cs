using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UniRpc.WebApplication;

namespace UniRpc.WebApplication
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

        public abstract bool Test(Person person);


        public override BaseMessage __invoke(BaseMessage message)
        {
            switch (message.Method)
            {
                case "Test":
                {
                    // Deserialize Parameters
                    Person person = message.Payload.GetProperty<Person>("person");
                    return message.ReturnMessage(Test(person));
                }
                default: throw new NotImplementedException($"{message.Service}.{message.Method} is not implemented.");
            }
        }
    }

    public class SampleServiceImpl: SampleService
    {

    }

}
