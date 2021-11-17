using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using UniRpc.WebApplication;
namespace MyService
{
    public interface IUICloseService
    {
        public System.Threading.Tasks.Task<string> test();
    }
}