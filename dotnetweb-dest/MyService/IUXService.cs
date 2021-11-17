using System.Collections.Generic;
using System;
using UniRpc.WebApplication;
namespace MyService
{
    public interface IUXService : MyService.IUICloseService
    {
        public void resolve();
    }
}