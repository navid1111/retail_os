export function DailyProgress() {
  const completed = 3
  const total = 8
  const percent = 37.5

  return (
    <section className="daily-progress" aria-label="Daily achievement">
      <div className="daily-progress__header">
        <span>Daily Achievement</span>
        <strong>{percent}%</strong>
      </div>
      <div className="daily-progress__track">
        <div style={{ width: `${percent}%` }} />
      </div>
      <div className="daily-progress__footer">
        <span>
          {completed} of {total} Stores Completed
        </span>
        <div className="daily-progress__dots" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <span
              className={index < completed ? 'daily-progress__dot--active' : ''}
              key={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
