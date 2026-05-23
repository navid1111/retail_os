import { Icon } from './Icon'

export function TopBar() {
  return (
    <header className="dashboard-topbar">
      <div className="dashboard-topbar__left">
        <div className="breadcrumb">
          <span>Field Ops</span>
          <Icon className="breadcrumb__icon" name="chevron_right" />
          <strong>Assigned Stores</strong>
        </div>
        <label className="top-search">
          <Icon name="search" />
          <input placeholder="Universal Search" type="text" />
        </label>
      </div>

      <div className="dashboard-topbar__right">
        <button className="round-action" type="button">
          <Icon name="notifications" />
        </button>
        <button className="round-action" type="button">
          <Icon name="help" />
        </button>
        <div className="dashboard-topbar__divider" />
        <div className="user-chip">
          <div className="user-chip__text">
            <strong>Navid R.</strong>
            <span>Field Representative</span>
          </div>
          <img
            alt="User profile avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhZMS4wg93gvOe4Hv4dCf70pNirNGl3gSle9d94gUo9k3pxa04yShDQf1AQwcA0d1OBYf8QjRddRvyAA997c6GGcfQP5CN867a6b0TA2gZpo6VB4VtYi8A9hF7L_ogtwJgIqfiMPTVMVPOnqXcWePFpw7O6R2Kuv00qCRttMrsNuToJHiWLF_AoeoKYNCsEEedOL68-dOwg8ici2tq7gCBHwjPHmgAk2YwYT34XY-RsfgsDvq4pATBUTilZxUR9j9MXNhmmM8wGqcI"
          />
        </div>
      </div>
    </header>
  )
}
