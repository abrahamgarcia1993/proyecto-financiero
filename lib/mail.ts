type SendInviteInput = {
  to: string;
  inviteToken: string;
};

type SendApprovedCredentialsInput = {
  to: string;
  tempPassword: string;
};

type SendAccessRequestNotificationInput = {
  name: string;
  email: string;
  reason: string;
  financialLevel: string;
};

async function getTransporter() {
  const nodemailer = await import('nodemailer');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

export async function sendAccessRequestNotification({
  name,
  email,
  reason,
  financialLevel
}: SendAccessRequestNotificationInput) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'abraham26mlg@gmail.com';

  if (!process.env.SMTP_HOST) {
    console.log(
      `Nueva solicitud para ${adminEmail}: ${name} | ${email} | nivel=${financialLevel} | motivo=${reason}`
    );
    return false;
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@financecontrol.local',
    to: adminEmail,
    subject: 'Nueva solicitud de acceso - Control Financiero',
    text: `Has recibido una nueva solicitud.\n\nNombre: ${name}\nCorreo electronico: ${email}\nNivel financiero: ${financialLevel}\nMotivo: ${reason}`
  });

  return true;
}

export async function sendInviteEmail({ to, inviteToken }: SendInviteInput) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const activationLink = `${appUrl}/?invite=${inviteToken}`;

  if (!process.env.SMTP_HOST) {
    console.log(`Invitacion para ${to}: ${activationLink}`);
    return false;
  }

  const transporter = await getTransporter();

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@financecontrol.local',
    to,
    subject: 'Enlace de activacion - Plataforma de Control Financiero',
    text: `Tu acceso fue aprobado. Activa tu cuenta aqui: ${activationLink}`
  });

  return true;
}

export async function sendApprovedCredentialsEmail({ to, tempPassword }: SendApprovedCredentialsInput) {
  const appUrl = process.env.APP_URL || 'http://localhost:3001';

  if (!process.env.SMTP_HOST) {
    console.log(`Credenciales temporales para ${to}: ${tempPassword}`);
    return false;
  }

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@financecontrol.local',
    to,
    subject: 'Tu cuenta ha sido activada - Control Financiero',
    text:
      `Tu cuenta fue activada por el administrador.\n\n` +
      `Contrasena temporal: ${tempPassword}\n` +
      `Acceso: ${appUrl}\n\n` +
      `Por seguridad, cambia tu contrasena al iniciar sesion.`
  });

  return true;
}
