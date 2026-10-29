import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { initialAnswers, sensationBodyAreas, type QuestionnaireAnswers } from './types'

type Stage = 'welcome' | 'guidelines' | 'recording' | 'complete' | 'questionnaire' | 'thank-you'

const QUESTION_COUNT = 8
const SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbz6MlCTmV92a0vwgEcqCRxosciTkL0RSKRWCgXN9exUh9-lXKUdnk7Q1qcu1qt5uxZIag/exec'

type SheetResponse = { ok: true; row: number }

async function sendToSheet(data: Record<string, unknown>): Promise<SheetResponse> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data),
      redirect: 'follow',
      signal: controller.signal,
    })

    let result: unknown
    try {
      result = await response.json()
    } catch {
      if (!response.ok) throw new Error(`Request failed with status ${response.status}.`)
      throw new Error('Invalid JSON response from Google Sheets.')
    }

    const resultObject = typeof result === 'object' && result !== null
      ? result as Record<string, unknown>
      : null
    const serverError = typeof resultObject?.error === 'string' && resultObject.error.trim()
      ? resultObject.error
      : undefined

    if (!response.ok) throw new Error(serverError ?? `Request failed with status ${response.status}.`)
    if (resultObject?.ok === false) throw new Error(serverError ?? 'Google Sheets could not save the response.')
    if (resultObject?.ok !== true || typeof resultObject.row !== 'number') {
      throw new Error('Invalid response from Google Sheets.')
    }

    return resultObject as SheetResponse
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Request timed out after 15 seconds.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

const questionTitles = [
  'Workspace adjustments',
  'Chair controls',
  'Physical sensations',
  'Shared workspace',
  'Exercise routine',
  'Health and past injuries',
  'Video link',
  'Anything else',
]

const adjustmentOptions = [
  'Seat height',
  'Armrest height or width',
  'Backrest tilt angle or tension',
  'Desk height',
  'Monitor distance or height',
  'Keyboard and mouse position',
  'Back support or lower-back cushion position',
  'Lighting or window blinds',
  'Nothing at all',
  'Other (please specify)',
]

const sensationRatingOptions = [
  'Neutral / Comfortable',
  'Mild discomfort',
  'Pain / Strain',
  'Numbness / Fatigue',
]

const yesNo = ['Yes', 'No']

function LeafMark() {
  return (
    <svg aria-hidden="true" className="leaf-mark" viewBox="0 0 32 32" fill="none">
      <path d="M25.5 5.5C16 5.5 8 8.5 8 17.5c0 3.8 2.8 6.5 6.4 6.5 8.3 0 11.1-9.7 11.1-18.5Z" />
      <path d="M5 27c4.3-7.5 8.8-11.2 15-15" />
    </svg>
  )
}

function SiteHeader({ showStep }: { showStep: boolean }) {
  return (
    <header className="site-header">
      <a className="brand" href="#" aria-label="Still at ease, beginning">
        <LeafMark />
        <span>still at ease</span>
      </a>
      <span className="header-note">
        <span className="privacy-dot" aria-hidden="true" />
        {showStep ? 'Your pace, your choice' : 'A workspace research study'}
      </span>
    </header>
  )
}

function PageShell({
  children,
  narrow = false,
  className = '',
}: {
  children: React.ReactNode
  narrow?: boolean
  className?: string
}) {
  return <main className={`page-shell${narrow ? ' page-shell-narrow' : ''} ${className}`}>{children}</main>
}

function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'text'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button className={`button button-${variant}`} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  )
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  const [consent, setConsent] = useState(false)

  return (
    <PageShell className="welcome-page">
      <div className="welcome-grid">
        <section className="welcome-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> A little research into everyday comfort</span>
          <h1>Let’s talk about<br /><em>how you sit.</em></h1>
          <p className="welcome-lede">
            The way we use a chair is personal. We’re learning how people settle in, make adjustments, and feel in their everyday workspaces.
          </p>
          <div className="welcome-details">
            <div className="detail-item">
              <span className="detail-number">01</span>
              <p><strong>A normal work session</strong><br />Record yourself working in your usual way.</p>
            </div>
            <div className="detail-item">
              <span className="detail-number">02</span>
              <p><strong>A short questionnaire</strong><br />Share what you know, notice, and feel.</p>
            </div>
          </div>
          <div className="time-note"><span aria-hidden="true">◷</span> Allow around one hour for your recording</div>
        </section>
        <aside className="welcome-art" aria-label="A quiet workspace illustration">
          <div className="art-sun" />
          <div className="art-window"><span /><span /><span /><span /></div>
          <div className="art-plant"><i /><i /><i /><i /><b /></div>
          <div className="art-desk"><div className="art-laptop"><span /></div><div className="art-cup" /></div>
          <div className="art-chair"><div className="chair-back" /><div className="chair-seat" /><div className="chair-post" /><div className="chair-foot" /><span className="chair-wheel" /></div>
          <div className="art-caption"><span>A study of the everyday</span><strong>Comfort is a practice.</strong></div>
          <div className="art-scribble" aria-hidden="true">~</div>
        </aside>
      </div>

      <section className="consent-panel" aria-labelledby="consent-title">
        <div className="consent-heading">
          <span className="consent-icon" aria-hidden="true">✳</span>
          <div>
            <span className="eyebrow">Before we begin</span>
            <h2 id="consent-title">Your choice matters</h2>
          </div>
        </div>
        <p>
          Participation is voluntary, and you may choose not to take part. The study explores how people use office chairs and workspaces by recording a typical work session and asking participants to complete a questionnaire.
        </p>
        <p className="data-note">
          The information and video recordings you provide will be used solely for research purposes and will not be shared with others. Please avoid recording anyone else unless they have given their consent, and ensure that any personal or confidential information is kept out of view.
        </p>
        <label className="consent-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I have read the study information, understand the purpose of the research, and voluntarily agree to participate. I give permission for my video and questionnaire responses to be used for the academic research as described.
          </span>
        </label>
        <div className="consent-actions">
          <span className="required-note">Please confirm your consent to continue.</span>
          <Button onClick={onContinue} disabled={!consent}>Continue <span aria-hidden="true">→</span></Button>
        </div>
      </section>
    </PageShell>
  )
}

const guidelineSteps = [
  {
    title: 'Position your camera',
    text: 'Frame your whole body while sitting, from your feet to the top of your head. Include your chair and workspace when you can.',
    icon: 'camera',
  },
  {
    title: 'Record continuously',
    text: 'Keep the recording unpaused and unedited. Take breaks whenever you need to; just leave the camera where it is.',
    icon: '↻',
  },
  {
    title: 'Check your storage',
    text: 'Make sure your device has enough room for a recording of about one hour.',
    icon: '▤',
  },
  {
    title: 'Try a short test',
    text: 'Record a few seconds and check your framing, camera angle, lighting, and picture clarity.',
    icon: '◉',
  },
]

function RecordingGuidelines({ onStart }: { onStart: () => void }) {
  return (
    <PageShell narrow>
      <PageIntro eyebrow="The recording · Before you begin" title="A few things to get ready" description="There’s no special way to work for this study. We’re interested in your usual routine." />
      <div className="guideline-list">
        {guidelineSteps.map((step) => (
          <article className="guideline-card" key={step.title}>
            <span className="guideline-icon" aria-hidden="true">
              {step.icon === 'camera' ? (
                <svg className="guideline-search-icon" viewBox="0 0 24 24" fill="none">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.2 4.2" />
                </svg>
              ) : step.icon}
            </span>
            <div><h2>{step.title}</h2><p>{step.text}</p></div>
          </article>
        ))}
      </div>
      <aside className="gentle-note"><span aria-hidden="true">✳</span><p><strong>A small privacy reminder</strong><br />Move personal or confidential information out of the camera’s view. Please don’t record other people without their permission.</p></aside>
      <div className="screen-actions"><span className="subtle-copy">Use your own device to record; this page won’t access your camera or microphone.</span><Button onClick={onStart}>Start session <span aria-hidden="true">→</span></Button></div>
    </PageShell>
  )
}

function RecordingTimer({ onFinish }: { onFinish: () => void }) {
  const [confirmFinish, setConfirmFinish] = useState(false)

  function finish() {
    onFinish()
    setConfirmFinish(false)
  }

  return (
    <PageShell narrow className="timer-page">
      <PageIntro eyebrow="Your work session" title="Settle into your day." description="Work as you normally would. There’s no need to watch the clock." />
      <section className="timer-card" aria-label="Session controls">
        <p className="timer-reminder">The study asks for a video of about one hour. Work as you normally would, and finish earlier or later if that better suits your day. Your video recording continues separately, and you can take breaks whenever you need to.</p>
        <div className="timer-actions">
          <Button variant="secondary" onClick={() => setConfirmFinish(true)}>Finish session</Button>
        </div>
      </section>
      <p className="timer-footnote">You can finish whenever you’re ready.</p>
      {confirmFinish && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirmFinish(false)}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="finish-title" onClick={(event) => event.stopPropagation()}>
            <span className="eyebrow">Whenever you’re ready</span>
            <h2 id="finish-title">Finish your session?</h2>
            <p>Your video recording will continue until you stop it on your own device.</p>
            <div className="dialog-actions"><Button variant="secondary" onClick={() => setConfirmFinish(false)}>Keep working</Button><Button onClick={finish}>Finish session</Button></div>
          </section>
        </div>
      )}
    </PageShell>
  )
}

function RecordingComplete({ onContinue }: { onContinue: () => void }) {
  return (
    <PageShell narrow className="completion-page">
      <div className="completion-mark" aria-hidden="true"><span>✓</span></div>
      <PageIntro eyebrow="The recording · Complete" title="Thank you for that time." description="Whenever you’re ready, a few small steps will bring your recording with you to the questionnaire." />
      <ol className="upload-steps">
        <li><span>01</span><p>Upload the recording to a cloud storage service of your choice.</p></li>
        <li><span>02</span><p>Set the sharing permissions so the research team can access it.</p></li>
        <li><span>03</span><p>Copy a shareable link and double-check its permissions.</p></li>
        <li><span>04</span><p>Continue to the questions and add your link when asked.</p></li>
      </ol>
      <p className="subtle-copy completion-note">You can proceed with a questionaire while the video is being uploaded. We'll ask for it at the end.</p>
      <div className="screen-actions"><span className="subtle-copy">Next up: 8 short questions</span><Button onClick={onContinue}>Continue to questions <span aria-hidden="true">→</span></Button></div>
    </PageShell>
  )
}

function ChoiceList({
  label,
  options,
  value,
  onChange,
  type = 'radio',
  exclusiveOptions = [],
  error,
}: {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  type?: 'checkbox' | 'radio'
  exclusiveOptions?: string[]
  error?: string
}) {
  const errorId = useId()

  function toggle(option: string) {
    if (type === 'radio') {
      onChange([option])
      return
    }
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option))
    } else if (exclusiveOptions.includes(option)) {
      onChange([option])
    } else {
      onChange([...value.filter((item) => !exclusiveOptions.includes(item)), option])
    }
  }

  return (
    <fieldset className="choice-fieldset" aria-describedby={error ? errorId : undefined}>
      <legend className="sr-only">{label}</legend>
      <div className="choice-list">
        {options.map((option) => (
          <label className={`choice-option${value.includes(option) ? ' is-selected' : ''}`} key={option}>
            <input type={type} name={label} checked={value.includes(option)} onChange={() => toggle(option)} />
            <span className="choice-indicator" aria-hidden="true" />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </fieldset>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional = false,
  required = false,
  rows = 4,
  type = 'text',
  error,
  min,
  max,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  required?: boolean
  rows?: number
  type?: 'text' | 'url' | 'number'
  error?: string
  min?: number
  max?: number
}) {
  const inputId = useId()

  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={inputId}>
        {label}
        {optional && <span className="optional-label">Optional</span>}
        {required && <span className="required-label">Required</span>}
      </label>
      {rows > 0 && type === 'text' ? (
        <textarea id={inputId} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} aria-invalid={Boolean(error)} />
      ) : (
        <input id={inputId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} min={min} max={max} required={required} inputMode={type === 'number' ? 'decimal' : undefined} />
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
}

function QuestionCard({
  step,
  children,
  error,
}: {
  step: number
  children: React.ReactNode
  error?: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  useEffect(() => sectionRef.current?.focus(), [step])

  return (
    <section ref={sectionRef} className="question-card" aria-labelledby="question-title" tabIndex={-1}>
      <span className="eyebrow">Question {step + 1}</span>
      <div className="question-content">
        {children}
        {error && <p className="field-error question-error" role="alert" id="question-error">{error}</p>}
      </div>
    </section>
  )
}

function Questionnaire({
  answers,
  setAnswers,
  onFinish,
  onBackToRecording,
  isSubmitting,
  statusMessage,
}: {
  answers: QuestionnaireAnswers
  setAnswers: React.Dispatch<React.SetStateAction<QuestionnaireAnswers>>
  onFinish: (data: Record<string, unknown>) => Promise<void>
  onBackToRecording: () => void
  isSubmitting: boolean
  statusMessage: string
}) {
  const [step, setStep] = useState(0)
  const [attemptedContinue, setAttemptedContinue] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const allowSubmit = useRef(false)

  function update<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) {
    setAnswers((current) => ({ ...current, [key]: value }))
  }

  function updateControl(index: number, field: 'known' | 'used', checked: boolean) {
    const unsureIndex = answers.controls.findIndex((control) => control.label === 'Unsure / don’t know')
    if (index === unsureIndex && checked) {
      update('controls', answers.controls.map((control, itemIndex) => ({
        ...control,
        known: itemIndex === unsureIndex,
        used: false,
      })))
      return
    }

    update('controls', answers.controls.map((control, itemIndex) => ({
      ...control,
      ...(itemIndex === index ? { [field]: checked } : {}),
      ...(index !== unsureIndex && itemIndex === unsureIndex ? { known: false } : {}),
    })))
  }

  function validationForQuestion(index: number) {
    switch (index) {
      case 0:
        return answers.adjustments.length ? '' : 'Select an option, including “Nothing at all” if that fits.'
      case 1:
        return answers.controls.some((control) => control.known || control.used)
          ? ''
          : 'Please mark at least one response. It’s okay to choose “Unsure / don’t know”.'
      case 2: {
        const areasToRate = [...sensationBodyAreas]
        const unratedAreas = areasToRate.filter((area) => !answers.sensationRatings[area])
        return unratedAreas.length
          ? `Choose one rating for each body area: ${unratedAreas.join(', ')}.`
          : ''
      }
      case 3:
        return answers.sharedWorkspace ? '' : 'Please choose yes or no.'
      case 4:
        return answers.exerciseActivity ? '' : 'Please give a brief description of your fitness level.'
      case 5:
        return answers.medicalConditions ? '' : 'Please choose an answer, or “Prefer not to say”.'
      case 6:
        if (!answers.videoLink.trim()) return 'Please provide a shareable video link to continue.'
        try {
          const parsed = new URL(answers.videoLink.trim())
          return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? '' : 'Enter a valid web link beginning with http:// or https://.'
        } catch {
          return 'Enter a valid web link beginning with http:// or https://.'
        }
      default:
        return ''
    }
  }

  function continueQuestion() {
    if (step < QUESTION_COUNT && validationForQuestion(step)) {
      setAttemptedContinue(true)
      return
    }
    setAttemptedContinue(false)
    if (step === QUESTION_COUNT - 1) setStep(QUESTION_COUNT)
    else if (step < QUESTION_COUNT) setStep((current) => current + 1)
  }

  function goBack() {
    setAttemptedContinue(false)
    if (step > 0) setStep((current) => current - 1)
    else onBackToRecording()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!allowSubmit.current) return
    allowSubmit.current = false
    const formData = new FormData(event.currentTarget)
    void onFinish({ ...Object.fromEntries(formData.entries()), ...answers })
  }

  const error = attemptedContinue ? validationForQuestion(step) : ''
  const percent = step === QUESTION_COUNT ? 100 : Math.round((step / QUESTION_COUNT) * 100)

  return (
    <PageShell narrow className="questionnaire-page">
      <form id="myForm" ref={formRef} onSubmit={handleSubmit}>
      <div className="questionnaire-heading">
        <div><span className="eyebrow">The questionnaire</span><h1>A little more about your workspace.</h1></div>
        <span className="progress-count">{step === QUESTION_COUNT ? 'Review' : `Question ${step + 1} of ${QUESTION_COUNT}`}</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Questionnaire progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>

      {step < QUESTION_COUNT ? (
        <QuestionCard step={step}>
          {step === 0 && <>
            <h2 id="question-title">What do you normally adjust before or during work, if anything?</h2>
            <p className="question-hint">Choose all that apply. “Nothing at all” is an exclusive choice.</p>
            <ChoiceList label="Workspace adjustments" options={adjustmentOptions} value={answers.adjustments} onChange={(value) => update('adjustments', value)} type="checkbox" exclusiveOptions={['Nothing at all']} error={error} />
            {answers.adjustments.includes('Other (please specify)') && <TextField label="What else do you adjust?" value={answers.adjustmentOther} onChange={(value) => update('adjustmentOther', value)} optional rows={0} placeholder="Your adjustment" />}
          </>}
          {step === 1 && <>
            <h2 id="question-title">Which chair controls do you know are available, and which of them do you actually use?</h2>
            <p className="question-hint">Knowing a control is there and choosing to use it are different things. Mark each column separately.</p>
            <div className="controls-table" role="group" aria-label="Chair control familiarity and use">
              <div className="controls-header"><span>Chair control</span><span>I know it exists</span><span>I use it</span></div>
              {answers.controls.map((control, index) => (
                <div className="control-row" key={control.label}>
                  <span>{control.label}</span>
                  <label className="table-check"><span className="sr-only">I know {control.label} exists</span><input type="checkbox" checked={control.known} onChange={(event) => updateControl(index, 'known', event.target.checked)} /></label>
                  {control.label === 'Unsure / don’t know' ? (
                    <span className="table-check not-applicable" aria-label="Not applicable">—</span>
                  ) : (
                    <label className="table-check"><span className="sr-only">I use {control.label}</span><input type="checkbox" checked={control.used} onChange={(event) => updateControl(index, 'used', event.target.checked)} /></label>
                  )}
                </div>
              ))}
            </div>
            {error && <p className="field-error" role="alert">{error}</p>}
          </>}
          {step === 2 && <>
            <h2 id="question-title">How do your body parts feel after working here for a while?</h2>
            <p className="question-hint">Choose one description for each area you’d like to rate. You can leave any area blank.</p>
            <div className="sensation-table-scroll" role="region" aria-label="Body area ratings table. Scroll horizontally to see every rating." tabIndex={0} aria-describedby={error ? 'sensation-error' : undefined}>
              <table className="sensation-table">
                <thead>
                  <tr>
                    <th scope="col">Body area</th>
                    {sensationRatingOptions.map((option) => <th scope="col" key={option}>{option}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...sensationBodyAreas, ...(answers.sensationsOther.trim() ? [answers.sensationsOther.trim()] : [])].map((area) => (
                    <tr key={area}>
                      <th scope="row">{area}</th>
                      {sensationRatingOptions.map((option) => (
                        <td key={option}>
                          <label className={`sensation-cell${answers.sensationRatings[area] === option ? ' is-selected' : ''}`}>
                            <span className="sr-only">{option} for {area}</span>
                            <input
                              type="radio"
                              name={`sensation-${area}`}
                              value={option}
                              required
                              aria-invalid={Boolean(error && !answers.sensationRatings[area])}
                              checked={answers.sensationRatings[area] === option}
                              onChange={() => update('sensationRatings', { ...answers.sensationRatings, [area]: option })}
                            />
                          </label>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="field-error" id="sensation-error" role="alert">{error}</p>}
            <TextField label="Would you like to describe these sensations in more detail?" value={answers.sensationsDetails} onChange={(value) => update('sensationsDetails', value)} optional placeholder="Share only what you’re comfortable sharing." />
          </>}
          {step === 3 && <>
            <h2 id="question-title">Do you share this desk or workspace with other people?</h2>
            <p className="question-hint">For example, hot-desking, shared office shifts, or family members working from home.</p>
            <ChoiceList label="Shared workspace" options={yesNo} value={answers.sharedWorkspace ? [answers.sharedWorkspace] : []} onChange={(value) => update('sharedWorkspace', value[0] ?? '')} error={error} />
            {answers.sharedWorkspace === 'Yes' && <div className="conditional-fields">
              <TextField label="What do you need to set up every time you sit down?" value={answers.sharedSetup} onChange={(value) => update('sharedSetup', value)} optional placeholder="For example, chair height, monitor, or keyboard position." />
              <TextField label="What makes you skip making adjustments?" value={answers.sharedSkip} onChange={(value) => update('sharedSkip', value)} optional placeholder="For example, being in a rush, complex or stiff controls, a temporary desk, or not knowing what to change." />
            </div>}
          </>}
          {step === 4 && <>
            <h2 id="question-title">How would you describe your overall fitness level?</h2>
            <TextField label="Your fitness level" value={answers.exerciseActivity} onChange={(value) => update('exerciseActivity', value)} placeholder="For example: active, fairly fit, less active, or any way you’d describe it." required error={error} />
          </>}
          {step === 5 && <>
            <h2 id="question-title">Do you have any chronic medical conditions or past injuries that affect your posture or comfort while working?</h2>
            <p className="question-hint">For example, back pain, carpal tunnel syndrome, or a previous injury. This question is optional; you don’t need to share a diagnosis.</p>
            <ChoiceList label="Health and past injuries" options={['Yes', 'No', 'Prefer not to say']} value={answers.medicalConditions ? [answers.medicalConditions] : []} onChange={(value) => update('medicalConditions', value[0] ?? '')} error={error} />
            {answers.medicalConditions === 'Yes' && <TextField label="Would you like to share any additional information?" value={answers.medicalDetails} onChange={(value) => update('medicalDetails', value)} optional placeholder="Share only what you’re comfortable sharing." />}
          </>}
          {step === 6 && <>
            <h2 id="question-title">Please provide the shareable link to your recording.</h2>
            <p className="question-hint">To share your recording with the research team:</p>
            <ol className="upload-steps">
              <li><span>01</span><p>Upload the recording to a cloud storage service of your choice.</p></li>
              <li><span>02</span><p>Set the sharing permissions so the research team can access it.</p></li>
              <li><span>03</span><p>Copy a shareable link and double-check its permissions.</p></li>
            </ol>
            <TextField label="Video link" value={answers.videoLink} onChange={(value) => update('videoLink', value)} type="url" rows={0} placeholder="https://" required error={error} />
          </>}
          {step === 7 && <>
            <h2 id="question-title">Is there anything else about your chair or workspace that you would like to share?</h2>
            <TextField label="Anything else on your mind?" value={answers.additionalComments} onChange={(value) => update('additionalComments', value)} optional placeholder="This is completely optional." />
          </>}
        </QuestionCard>
      ) : (
        <ReviewAnswers answers={answers} onEdit={setStep} />
      )}

      <div className="question-navigation">
        <Button variant="secondary" onClick={goBack}><span aria-hidden="true">←</span> {step === 0 ? 'Back to recording' : step === QUESTION_COUNT ? 'Back to questions' : 'Back'}</Button>
        {step < QUESTION_COUNT ? (
          <Button onClick={continueQuestion}>{step === QUESTION_COUNT - 1 ? 'Review answers' : 'Continue'} <span aria-hidden="true">→</span></Button>
        ) : (
          <Button onClick={() => {
            allowSubmit.current = true
            formRef.current?.requestSubmit()
          }} disabled={isSubmitting}>Submit questionnaire <span aria-hidden="true">→</span></Button>
        )}
      </div>
      <p id="status" role={statusMessage ? 'alert' : 'status'} aria-live="polite">{statusMessage}</p>
      </form>
    </PageShell>
  )
}

function ReviewAnswers({
  answers,
  onEdit,
}: {
  answers: QuestionnaireAnswers
  onEdit: (step: number) => void
}) {
  const details = [
    [...answers.adjustments.filter((item) => item !== 'Other (please specify)'), answers.adjustmentOther].filter(Boolean).join('\n'),
    answers.controls.map((control) => control.label === 'Unsure / don’t know'
      ? `${control.label}: ${control.known ? 'selected' : 'not selected'}`
      : `${control.label}: ${control.known ? 'knows it exists' : 'doesn’t know it exists'}; ${control.used ? 'uses it' : 'doesn’t use it'}`).join('\n'),
    [
      ...Object.entries(answers.sensationRatings)
        .filter(([, rating]) => rating)
        .map(([area, rating]) => `${area}: ${rating}`),
      answers.sensationsDetails,
    ].filter(Boolean).join('\n'),
    answers.sharedWorkspace === 'Yes'
      ? ['Yes', answers.sharedSetup && `Setup: ${answers.sharedSetup}`, answers.sharedSkip && `Skipped adjustments: ${answers.sharedSkip}`].filter(Boolean).join('\n')
      : answers.sharedWorkspace,
    answers.exerciseActivity,
    answers.medicalConditions === 'Yes'
      ? ['Yes', answers.medicalDetails].filter(Boolean).join('\n')
      : answers.medicalConditions,
    answers.videoLink,
    answers.additionalComments,
  ]

  return (
    <section className="review-card" aria-labelledby="question-title">
      <span className="eyebrow">One last look</span>
      <h2 id="question-title">Review your answers</h2>
      <p className="question-hint">Select “Edit” beside any answer to change it.</p>
      <div className="review-list">
        {questionTitles.map((title, index) => {
          const answer = details[index]

          return (
          <article className="review-item" key={title}>
            <div><span className="review-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{answer ? answer.split('\n').map((line, lineIndex) => {
              const separatorIndex = line.indexOf(':')
              return (
                <span className="review-answer-line" key={`${title}-${lineIndex}`}>
                  {separatorIndex >= 0 ? <><strong>{line.slice(0, separatorIndex + 1)}</strong>{line.slice(separatorIndex + 1)}</> : line}
                </span>
              )
            }) : <em>Not answered</em>}</p></div></div>
            <button type="button" className="edit-link" onClick={() => onEdit(index)} aria-label={`Edit ${title}`}>Edit</button>
          </article>
          )
        })}
      </div>
    </section>
  )
}

function ThankYou({ statusMessage }: { statusMessage: string }) {
  return (
    <PageShell narrow className="thank-you-page">
      <div className="completion-mark" aria-hidden="true"><span>✳</span></div>
      <PageIntro eyebrow="Study complete" title="Thank you for sharing your time." description="Your thoughtful answers help researchers understand how everyday workspaces are really used." />
      <p id="status" role="status" aria-live="polite">{statusMessage}</p>
      <div className="thank-you-note"><p><strong>A note about your responses</strong></p><p>Your questionnaire has been saved for the study.</p></div>
      <p className="closing-line">Wishing you a comfortable rest of your day.</p>
    </PageShell>
  )
}

function App() {
  const [stage, setStage] = useState<Stage>('welcome')
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const submissionInProgress = useRef(false)

  function finishSession() {
    setStage('complete')
  }

  async function submitQuestionnaire(data: Record<string, unknown>) {
    if (submissionInProgress.current) return
    submissionInProgress.current = true
    setIsSubmitting(true)
    setStatusMessage('')

    try {
      await sendToSheet(data)
      setStatusMessage("")
      setStage('thank-you')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to save your responses.')
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="app-frame">
      <SiteHeader showStep={stage !== 'welcome' && stage !== 'thank-you'} />
      {stage === 'welcome' && <WelcomeScreen onContinue={() => setStage('guidelines')} />}
      {stage === 'guidelines' && <RecordingGuidelines onStart={() => setStage('recording')} />}
      {stage === 'recording' && <RecordingTimer onFinish={finishSession} />}
      {stage === 'complete' && <RecordingComplete onContinue={() => setStage('questionnaire')} />}
      {stage === 'questionnaire' && <Questionnaire answers={answers} setAnswers={setAnswers} onFinish={submitQuestionnaire} onBackToRecording={() => setStage('complete')} isSubmitting={isSubmitting} statusMessage={statusMessage} />}
      {stage === 'thank-you' && <ThankYou statusMessage={statusMessage} />}
      <footer className="site-footer"><span>Made for real workdays</span>      <span>Take your time. Sensitive and follow-up questions are optional.</span></footer>
    </div>
  )
}

export default App
