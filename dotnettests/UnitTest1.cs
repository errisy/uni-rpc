using System;
using System.Diagnostics;
using Xunit;
using System.Text.Json;
using Shouldly;
using vbpackage1;

namespace dotnettests
{
    public class BaseMessage
    {
        public string name { get; set; }
        public JsonElement value { get; set; }
    }

    public class Person {
        public int age { get; set; }
        public string gender { get; set; }
    }

    public static class JsonExtensions
    {
        public static T GetProperty<T>(this JsonElement element, string name)
        {
            return JsonSerializer.Deserialize<T>(element.GetProperty(name).GetRawText());
        }
    }

    public class UnitTest1
    {
        [Fact(DisplayName = "Test if the partial JSON deserialization works here.")]
        public void TestPartialJsonDeserialization()
        {
            var json = @"{
    ""name"": ""tom"",
    ""value"": {
        ""age"": 30,
        ""gender"": ""male""
    }
}";


            var element = JsonSerializer.Deserialize<JsonElement>(json);

            var name = element.GetProperty<string>("name");
            name.ShouldBe("tom");

            var person = element.GetProperty<Person>("value");
            person.age.ShouldBe(30);
            person.gender.ShouldBe("male");

            var message = JsonSerializer.Deserialize<BaseMessage>(json);

            message.name.ShouldBe("tom");
            var personViaMessage = JsonSerializer.Deserialize<Person>(message.value.GetRawText());
            personViaMessage.age.ShouldBe(30);
            personViaMessage.gender.ShouldBe("male");

            //personViaMessage.gender.ShouldBe("female");

            //Debugger.Break();
        }

        [Fact(DisplayName = "Test VB Code")]
        void TestVBCode ()
        {
            MyClassTest.Add(3, 5).ShouldBe(8);
        }
    }
}
