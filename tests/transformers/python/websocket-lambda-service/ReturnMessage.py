from UniRpc.BaseMessage import BaseMessage

def ReturnMessage(message: BaseMessage, value: object) -> BaseMessage:
    return {
        'Id': message['Id'],
        'Service': message['Service'],
        'Method': message['Method'],
        'GenericArguments': message['GenericArguments'],
        'Payload': value,
        'Success': message['Success']
    }