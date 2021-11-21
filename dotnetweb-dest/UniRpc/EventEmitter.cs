namespace UniRpc.WebApplication
{
    public class EventEmitter<T> where T : BaseMessage
    {
        WebSocketServiceBase webSocketServiceBase;
        public EventEmitter(WebSocketServiceBase webSocketServiceBase)
        {
            this.webSocketServiceBase = webSocketServiceBase;
        }
        
        public void Emit(T message)
        {
            webSocketServiceBase.__outgoing.OnNext(message);
        }
    }
}
