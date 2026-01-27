/**
 * Email HTML template for Magic Link authentication
 * Clean, minimalist Spanish version
 */

interface EmailTemplateParams {
  url: string;
  host: string;
  email: string;
}

export function html({ url, host, email }: EmailTemplateParams) {
  const escapedEmail = email.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inicia sesión en Carioca</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          
          <!-- Simple Header -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; color: #0f172a; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                Carioca
              </h1>
              <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">
                Juego de cartas online
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px;">
                Hola,
              </p>
              
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px;">
                Solicitaste iniciar sesión en <strong>Carioca</strong> con esta dirección de correo:
              </p>

              <div style="background-color: #f1f5f9; border-radius: 6px; padding: 12px; margin-bottom: 32px; text-align: center;">
                <code style="color: #3b82f6; font-size: 14px; font-family: 'Courier New', monospace;">
                  ${escapedEmail}
                </code>
              </div>

              <p style="margin: 0 0 24px; color: #334155; font-size: 16px;">
                Haz clic en el botón para acceder:
              </p>

              <!-- Simple CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 32px;">
                    <a href="${url}" target="_blank" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 15px;">
                      Iniciar sesión
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative link -->
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0 0 32px; word-break: break-all; color: #94a3b8; font-size: 12px; font-family: 'Courier New', monospace;">
                ${url}
              </p>

              <!-- Simple security notice -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 24px;">
                <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">
                  <strong>Nota de seguridad:</strong>
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                  Este enlace expira en 24 horas y solo puede usarse una vez. Si no solicitaste este correo, puedes ignorarlo.
                </p>
              </div>
            </td>
          </tr>

          <!-- Simple Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                © ${new Date().getFullYear()} Carioca · ${host}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function text({ url, host }: EmailTemplateParams) {
  return `
Inicia sesión en Carioca

Hola,

Solicitaste iniciar sesión en Carioca.

Haz clic en el siguiente enlace para acceder:
${url}

Este enlace expira en 24 horas y solo puede usarse una vez.

Si no solicitaste este correo, puedes ignorarlo.

---
Carioca
${host}
`;
}
