
ServiceUserGroups = {
    'Administrators': {
        'Name': 'Administrators',
        'Services': {
            'MyService.DevService': '*',
            'MyService.MXU': ['resolve']
        }
    },
    'Users': {
        'Name': 'Users',
        'Services': {
            'MyService.MXU': '*'
        }
    },
    'Customers': {
        'Name': 'Customers',
        'Services': {
            'MyService.DevService': '*'
        }
    }
}
TesterUserGroups = {
    'MainTester': {
        'Name': 'MainTester',
        'Services': {
            'MyService.DevService': '*'
        }
    }
}
__PolicySets = {
    'ServiceUserGroups': ServiceUserGroups,
    'TesterUserGroups': TesterUserGroups
}