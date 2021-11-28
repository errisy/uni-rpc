
export const ServiceUserGroups = {
    Administrators: {
        Name: 'Administrators',
        Services: {
            'MyService.DevService': '*',
            'MyService.MXU': ['resolve']
        }
    },
    Users: {
        Name: 'Users',
        Services: {
            'MyService.MXU': '*'
        }
    }
};
export const __PolicySets = {
    ServiceUserGroups: ServiceUserGroups
};