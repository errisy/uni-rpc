
namespace MyService {

    export namespace SubService {
        export class SubMessage<T> {

        }
    }

    export abstract class DevService<Dog> {
        abstract Send(message: Message): boolean;
        abstract Get(): boolean;
        abstract StoryCount(): number;
        abstract Test(): string;
        abstract AB(my: double): float;
        abstract Gap(value: integer, enabled: boolean): List<long>;
        abstract Release<Cat> (cat: Cat, dog: Dog): bytes;
    }

    export class Message {
        name: string;
        value: integer;
        tested: boolean;
        sub: MyService.SubService.SubMessage<MyService.Message>;
    }
}

namespace MyService {
    
    
}



