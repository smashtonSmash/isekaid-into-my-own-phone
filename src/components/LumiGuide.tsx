import cheeringUrl from '../assets/lumi/cheering.webp'
import explainingUrl from '../assets/lumi/explaining.webp'
import surprisedUrl from '../assets/lumi/surprised.webp'
import wavingUrl from '../assets/lumi/waving.webp'

export type LumiExpression = 'waving' | 'explaining' | 'cheering' | 'surprised'

const EXPRESSIONS: Record<LumiExpression, string> = {
  waving: wavingUrl,
  explaining: explainingUrl,
  cheering: cheeringUrl,
  surprised: surprisedUrl,
}

export function LumiGuide({
  popKey,
  expression,
  kicker,
  line,
  onDismiss,
}: {
  popKey: string
  expression: LumiExpression
  kicker: string
  line: string
  onDismiss?: () => void
}) {
  const words = (
    <>
      <strong>{kicker}</strong>
      <p>{line}</p>
    </>
  )

  return (
    <div className="lumi-pop" key={popKey} role="status" aria-live="polite">
      <img src={EXPRESSIONS[expression]} alt="" />
      {onDismiss ? (
        <button type="button" className="lumi-bubble" onClick={onDismiss}>
          {words}
        </button>
      ) : (
        <div className="lumi-bubble">{words}</div>
      )}
    </div>
  )
}
