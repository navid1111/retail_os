import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { Icon } from '../components/dashboard/Icon'
import {
  createAdminUser,
  getAdminUsers,
  type AdminUser,
  type AdminUserRole,
} from '../services/adminUsers'

const initialForm = {
  fullName: '',
  email: '',
  role: 'rep' as AdminUserRole,
  region: 'Dhaka',
  password: '',
}

const roleLabels: Record<AdminUserRole, string> = {
  rep: 'Rep',
  supervisor: 'Supervisor',
  admin: 'Admin',
}

function UserStat({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <section className={`admin-user-stat ${danger ? 'admin-user-stat--danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  )
}

function UserModal({
  isOpen,
  isSubmitting,
  error,
  form,
  onClose,
  onChange,
  onSubmit,
}: {
  isOpen: boolean
  isSubmitting: boolean
  error: string
  form: typeof initialForm
  onClose: () => void
  onChange: (form: typeof initialForm) => void
  onSubmit: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="admin-user-modal" role="dialog" aria-modal="true">
      <div className="admin-user-modal__panel">
        <header>
          <h4>New User Creation</h4>
          <button aria-label="Close modal" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </header>

        <form
          className="admin-user-form"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <label>
            <span>Full Name</span>
            <input
              onChange={(event) => onChange({ ...form, fullName: event.target.value })}
              placeholder="e.g. John Doe"
              required
              type="text"
              value={form.fullName}
            />
          </label>
          <label>
            <span>Email Address</span>
            <input
              onChange={(event) => onChange({ ...form, email: event.target.value })}
              placeholder="john.doe@retailos.com"
              required
              type="email"
              value={form.email}
            />
          </label>
          <div className="admin-user-form__grid">
            <label>
              <span>Access Level</span>
              <select
                onChange={(event) =>
                  onChange({ ...form, role: event.target.value as AdminUserRole })
                }
                value={form.role}
              >
                <option value="rep">Rep</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              <span>Operational Region</span>
              <select
                onChange={(event) => onChange({ ...form, region: event.target.value })}
                value={form.region}
              >
                <option>Global</option>
                <option>Dhaka</option>
                <option>Chittagong</option>
                <option>Sylhet</option>
                <option>Rajshahi</option>
              </select>
            </label>
          </div>
          <label>
            <span>Temporary Password</span>
            <input
              minLength={8}
              onChange={(event) => onChange({ ...form, password: event.target.value })}
              required
              type="password"
              value={form.password}
            />
          </label>

          {error ? <p className="admin-user-form__error">{error}</p> : null}

          <div className="admin-user-form__actions">
            <button disabled={isSubmitting} onClick={onClose} type="button">
              Cancel
            </button>
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Commit Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialForm)

  useEffect(() => {
    let isMounted = true

    getAdminUsers()
      .then((items) => {
        if (isMounted) {
          setUsers(items)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to fetch users')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) {
      return users
    }

    return users.filter((user) =>
      [user.fullName, user.email, user.role, user.region]
        .join(' ')
        .toLowerCase()
        .includes(term)
    )
  }, [search, users])

  const createUser = async () => {
    setIsSubmitting(true)
    setError('')

    try {
      const user = await createAdminUser(form)
      setUsers((current) => [user, ...current])
      setForm(initialForm)
      setIsModalOpen(false)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeUsers = users.filter((user) => user.isActive).length
  const adminUsers = users.filter((user) => user.role === 'admin').length

  return (
    <AdminLayout title="RetailOS Admin">
      <section className="admin-users-page">
        <div className="admin-users-overview">
          <UserStat label="Users" value={String(users.length).padStart(2, '0')} />
          <UserStat label="Active" value={String(activeUsers).padStart(2, '0')} />
          <UserStat danger label="Admins" value={String(adminUsers).padStart(2, '0')} />
        </div>

        <section className="admin-users-panel">
          <div className="admin-users-toolbar">
            <label>
              <Icon name="search" />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search system users..."
                type="text"
                value={search}
              />
            </label>
            <button onClick={() => setIsModalOpen(true)} type="button">
              <Icon name="add" />
              Create User
            </button>
          </div>

          {isLoading ? <div className="admin-users-state">Loading users</div> : null}
          {!isLoading && error ? <div className="admin-users-state admin-users-state--error">{error}</div> : null}

          <div className="admin-users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Region</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={user.role === 'admin' ? 'admin-role admin-role--admin' : 'admin-role'}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="admin-users-table__mono">{user.region}</td>
                    <td>
                      <span className="admin-user-status">
                        <i />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="admin-users-footer">
            Showing {filteredUsers.length} of {users.length} system users
          </footer>
        </section>

        <UserModal
          error={error}
          form={form}
          isOpen={isModalOpen}
          isSubmitting={isSubmitting}
          onChange={setForm}
          onClose={() => {
            setIsModalOpen(false)
            setError('')
          }}
          onSubmit={() => void createUser()}
        />
      </section>
    </AdminLayout>
  )
}
