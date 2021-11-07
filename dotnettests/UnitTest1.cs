using System;
using System.Diagnostics;
using Xunit;
using System.Text.Json;
using Shouldly;

namespace dotnettests
{

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

        }
    }
}
