/** Mark the class as uni-rpc service. */
// export declare function config(): <T extends { new (...args: any[]): {} }>(constructor: T) => any;

// export declare function rpc(): <T extends { new (...args: any[]): {} }>(constructor: T) => any;

// export declare function message(): <T extends { new (...args: any[]): {} }>(constructor: T) => any;

declare type int32 = 'int32';

declare type integer = 'int32';

declare type int64 = 'int64';

declare type long = 'int64';

declare type float = 'float';

declare type double = 'double';

declare type bytes = 'bytes';

declare class List<T> {}

declare class Dict<TKey, TValue> {}

declare class Sequence<T> {}

declare class Config {}

/** The observable source */
declare class Source<T> {}

/** The observable sink */
declare class Sink<T> {}

declare class EventEmitter<T> {
    Emit(message: T): void;
}

declare interface IGroupDescriptor<T> {
    AllowServices(...services: Function[]): IGroupDescriptor<T>;
    AllowMethods(...methods: CallableFunction[]): IGroupDescriptor<T>;
}

declare class __GroupManager {
    static Set<T>(group: T): IGroupDescriptor<T>;
}