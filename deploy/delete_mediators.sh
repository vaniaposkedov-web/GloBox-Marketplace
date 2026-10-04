#!/bin/bash
cd /root/marketplace

node -e "
const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  // Show existing
  const profiles = await p.mediatorProfile.findMany({ select: { id: true, userId: true, status: true } });
  console.log('Found mediator profiles:', profiles.length);
  console.log(JSON.stringify(profiles, null, 2));

  // Delete notification subscriptions for mediator users
  const userIds = profiles.map(p => p.userId);
  if (userIds.length > 0) {
    const delSubs = await p.notificationSubscription.deleteMany({ where: { userId: { in: userIds } } });
    console.log('Deleted notification subscriptions:', delSubs.count);
  }

  // Delete mediator profiles
  const del = await p.mediatorProfile.deleteMany({});
  console.log('Deleted mediator profiles:', del.count);

  // Reset user roles back to BUYER for mediator users (optional, set role back)
  const updated = await p.user.updateMany({ where: { id: { in: userIds }, role: 'MEDIATOR' }, data: { role: 'BUYER' } });
  console.log('Reset user roles to BUYER:', updated.count);

  await p.\$disconnect();
})();
"
