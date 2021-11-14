import re, json
from typing import TypedDict
from os_utilities import my_class


class Person(TypedDict):
    name: str
    age: int


p: Person = {}

p['name'] = 'alex'
p['age'] = 22

p['age'] = 33

print(json.dumps(p))

mc = my_class()