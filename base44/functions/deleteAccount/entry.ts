import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Clear all user-owned data
    const [flips, inventory, expenses] = await Promise.all([
      base44.entities.Flip.list('-created_date', 1000),
      base44.entities.Inventory.list('-created_date', 1000),
      base44.entities.Expense.list('-created_date', 1000),
    ]);

    await Promise.all([
      ...flips.map(f => base44.entities.Flip.delete(f.id)),
      ...inventory.map(i => base44.entities.Inventory.delete(i.id)),
      ...expenses.map(e => base44.entities.Expense.delete(e.id)),
    ]);

    // Clear personal profile data
    await base44.auth.updateMe({
      bio: '',
      location: '',
      username: '',
      profile_picture: null,
      is_pro: false,
      pro_expires_at: null,
      stripe_customer_id: null,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});