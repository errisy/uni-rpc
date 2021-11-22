enum ServiceUserGroups {
    Administrators,
    Users
}

__GroupManager.Set(ServiceUserGroups.Administrators)
.AllowMethods(
    MyService.DevService.prototype.AB,
    MyService.MXU.prototype.resolve
    )
.AllowServices(MyService.       DevService);

__GroupManager.Set(ServiceUserGroups.Users)
.AllowServices(MyService . MXU);
