// Classic PayPal "Donate" button — a plain HTML <form> POSTing to
// paypal.com/donate with a hosted_button_id. Unlike the hosted-button *SDK*
// (see PayPalHostedButton, which had to be iframe-isolated because the SDK's
// JS broke the site nav), this loads NO PayPal script — it's just a form
// submit — so it's safe to render inline as a server component and carries no
// DOM/layout side effects. Styled as the site's gold button; opens PayPal in a
// new tab so the visitor keeps our page open.
export default function PayPalDonateButton({
  hostedButtonId,
  label,
}: {
  hostedButtonId: string
  label: string
}) {
  return (
    <form
      action="https://www.paypal.com/donate"
      method="post"
      target="_blank"
      rel="noopener noreferrer"
      className="nh-pp-donate"
      style={{ margin: 0 }}
    >
      <input type="hidden" name="hosted_button_id" value={hostedButtonId} />
      <button type="submit" className="nh-ticket-btn">
        {label} &rarr;
      </button>
    </form>
  )
}
