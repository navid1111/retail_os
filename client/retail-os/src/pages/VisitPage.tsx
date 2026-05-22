import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/dashboard/Icon'
import { getStoreById, type Store } from '../services/stores'

type VisitPageProps = {
  storeId: string
}

const formatTimer = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

function VisitTopBar({ store }: { store: Store | null }) {
  return (
    <header className="visit-topbar">
      <div className="visit-topbar__inner">
        <div className="visit-topbar__left">
          <a className="visit-back" href={store ? `/stores/${store._id}` : '/stores'}>
            <Icon name="arrow_back" />
            <span>Back</span>
          </a>
          <div className="visit-topbar__divider" />
          <div className="visit-store-title">
            <h1>{store?.storeName ?? 'Store Visit'}</h1>
            <span>STORE ID: {store?.storeCode ?? '...'}</span>
          </div>
        </div>
        <a className="visit-button visit-button--ghost" href="/stores">
          Cancel Visit
        </a>
      </div>
    </header>
  )
}

function VisitProgress({ seconds }: { seconds: number }) {
  return (
    <aside className="visit-card visit-progress">
      <div className="visit-progress__timer">
        <span>Time Elapsed</span>
        <strong>{formatTimer(seconds)}</strong>
        <p>
          <Icon name="schedule" />
          Started 11:05 AM
        </p>
      </div>
      <div className="visit-progress__steps">
        <span>Progress</span>
        <div className="visit-step visit-step--done">
          <i>
            <Icon name="check" />
          </i>
          <span>Check-in</span>
        </div>
        <div className="visit-step visit-step--active">
          <i>
            <b />
          </i>
          <span>Photo Documentation</span>
        </div>
        <div className="visit-step visit-step--pending">
          <i />
          <span>Review &amp; Submit</span>
        </div>
      </div>
    </aside>
  )
}

function PhotoDocumentation() {
  return (
    <section className="visit-card photo-doc">
      <div className="photo-doc__header">
        <h2>
          <Icon name="photo_camera" />
          Shelf Documentation
        </h2>
        <span>Required</span>
      </div>
      <div className="photo-doc__dropzone">
        <div>
          <Icon name="add_a_photo" />
        </div>
        <p>No photographic evidence captured.</p>
        <button className="visit-button visit-button--primary" type="button">
          <Icon name="camera_enhance" />
          Capture Image
        </button>
      </div>
      <p>Guidelines: Ensure focus on SKUs, pricing tags, and shelf talkers.</p>
    </section>
  )
}

function VisitNotesAndSubmit({ storeId }: { storeId: string }) {
  return (
    <aside className="visit-side-stack">
      <section className="visit-card visit-notes-card">
        <h2>
          <Icon name="notes" />
          Field Notes
        </h2>
        <textarea placeholder="Enter observations..." />
      </section>
      <section className="visit-card visit-submit-card">
        <a
          className="visit-button visit-button--primary visit-submit"
          href={`/stores/${storeId}/analysis`}
        >
          <Icon name="check_circle" />
          Submit Visit
        </a>
        <div className="visit-warning">
          <Icon name="warning" />
          <p>Status: Validation Error. Photographic proof required before submission.</p>
        </div>
      </section>
    </aside>
  )
}

export function VisitPage({ storeId }: VisitPageProps) {
  const [store, setStore] = useState<Store | null>(null)
  const [error, setError] = useState('')
  const [seconds, setSeconds] = useState(83)

  useEffect(() => {
    let isMounted = true

    getStoreById(storeId)
      .then((item) => {
        if (isMounted) {
          setStore(item)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to fetch store'
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [storeId])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  const storeName = useMemo(() => store?.storeName ?? 'Field Visit', [store])

  return (
    <div className="visit-page">
      <VisitTopBar store={store} />
      <main className="visit-main">
        {error ? <div className="store-state store-state--error">{error}</div> : null}
        <div className="visit-heading">
          <div>
            <span>Session: Active Audit</span>
          </div>
          <h2>{storeName} Data Entry</h2>
        </div>
        <div className="visit-grid">
          <VisitProgress seconds={seconds} />
          <PhotoDocumentation />
          <VisitNotesAndSubmit storeId={storeId} />
        </div>
      </main>
    </div>
  )
}
