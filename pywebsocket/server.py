import websockets
import asyncio
from typing import TypedDict, Dict, Coroutine
import json
from UniRpc.BaseMessage import BaseMessage


class Jack(dict):
    @property
    def Name(self):
        return self['Name']
    @Name.setter
    def Name(self, value: str):
        self['Name'] = value


jack = Jack()

message = BaseMessage({
    'Id': 'jac',
    'Method': 'x-method',
    'Payload': {
        'Id': 'blaze'
    }
})

jack.Name = '20'

print('jack:', json.dumps(jack))

print('message:', message['Id'], message['Method'], message['Payload']['Id'])


async def websocket_handler(websocket, path):
    name = await websocket.recv()
    print("< {}".format(name))

    greeting = "Hello {}!".format(name)
    await websocket.send(greeting)
    print("> {}".format(greeting))


start_server = websockets.serve(websocket_handler, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()


