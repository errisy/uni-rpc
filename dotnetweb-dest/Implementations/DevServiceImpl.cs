using MyService;
using System.Collections.Generic;

namespace dotnetweb.Implementations
{
    public class DevServiceImpl<T> : MyService.DevService<T>
    {
        public override float AB(double my)
        {
            throw new System.NotImplementedException();
        }

        public override List<long> Gap(int value, bool enabled)
        {
            throw new System.NotImplementedException();
        }

        public override bool Get()
        {
            throw new System.NotImplementedException();
        }

        public override Message GetMessage()
        {
            throw new System.NotImplementedException();
        }

        public override void IncomingCall()
        {
            throw new System.NotImplementedException();
        }

        public override byte[] Release<Cat>(Cat cat, T dog)
        {
            throw new System.NotImplementedException();
        }

        public override bool Send(Message message)
        {
            throw new System.NotImplementedException();
        }

        public override float StoryCount()
        {
            throw new System.NotImplementedException();
        }

        public override string Test()
        {
            throw new System.NotImplementedException();
        }
    }
}
