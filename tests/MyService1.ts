// import { double, float, int32, int64, integer, List, long } from 'uni-rpc-lib';


// import 'node_modules/uni-rpc-lib/index';

namespace MyService {

    export abstract class DevService {
        abstract Send(message: Message): boolean;
        abstract Get(): boolean;
        abstract Test(): string;
        abstract AB(my: double): float;
        abstract Gap(value: integer, enabled: boolean): List<long>;
    }

    export class Message {
        name: string;
        value: integer;
        tested: boolean;
    }
}

namespace MyService {
    
}

