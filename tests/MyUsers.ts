enum ServiceUserGroups {
    Administrators,
    Users,
    Customers
}

__GroupManager.Set(ServiceUserGroups.Administrators)
.AllowMethods(
    MyService.DevService.prototype.AB,
    MyService.MXU.prototype.resolve
    )
.AllowServices(MyService.DevService);

__GroupManager.Set(ServiceUserGroups.Users)
.AllowServices(MyService.MXU);

__GroupManager.Set(ServiceUserGroups.Customers)
.AllowServices(MyService.DevService);

enum TesterUserGroups {
    MainTester,
    SubTester
}

__GroupManager.Set(TesterUserGroups.MainTester)
.AllowServices(MyService.DevService);