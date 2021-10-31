/** Mark the class as uni-rpc service. */
export declare function rpc<T extends { new (...args: any[]): {} }>(constructor: T);

export declare type Boolean = 'Boolean';

export declare type String = 'String';

export declare type Int32 = 'Int32';

export declare type Int64 = 'Int64';

export declare type Float = 'Float';

export declare type Double = 'Double';

export declare class List<T> {}

export declare class Map<TKey, TValue> {}

export declare class Array<T> {}