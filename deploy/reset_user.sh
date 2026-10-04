#!/bin/bash
cd /root/marketplace

node -e "
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  const user = await p.user.findFirst({ where: { email: 'vana.protop@gmail.com' } });
  if (!user) { console.log('User not found'); await p.\$disconnect(); return; }
  console.log('Found user:', JSON.stringify(user, null, 2));

  // Delete related records
  const delSubs = await p.notificationSubscription.deleteMany({ where: { userId: user.id } });
  console.log('Deleted notification subs:', delSubs.count);

  const delProfile = await p.mediatorProfile.deleteMany({ where: { userId: user.id } });
  console.log('Deleted mediator profile:', delProfile.count);

  const delUser = await p.user.delete({ where: { id: user.id } });
  console.log('Deleted user:', delUser.email);

  await p.\$disconnect();
})();
"
