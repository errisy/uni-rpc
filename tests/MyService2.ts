
namespace MyService {
    export class OKS{
        test: MyService.OKS;
        // Try the array of OKS
        okss: MyService.OKS[];
        // Try the generic type List
        cheese: List<MyService.OKS>;
        use: Dict<string, MyService.OKS>;
    }

    export interface IBaseMessage {
        Id: string;
        Service: string;
        Method: string;
        GenericArguments: string[];
        Payload: string;
        Success: boolean;
        ErrorMessage: string;
    }
}


namespace USE {
    export class Tom<Thrift> {
        value: List<Thrift[]>;
    }
}
