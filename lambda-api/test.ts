process.env['AWS_REGION'] = process.env['AWS_DEFAULT_REGION'];

import { KEGGRequest } from './lambda';

(async () => {
    try {
        let result = await KEGGRequest({
            Method: 'get',
            Key: 'hsa:10458'
        } as any);
        console.log('result:', result);
    } catch (ex) {
        console.error(ex);
    }

})();