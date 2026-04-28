const Booking = require('../models/Booking');
const Hall = require('../models/Hall');
const moment = require('moment');

// @route   GET /api/bookings/reports
// @access  Private (admin, superadmin)
const getReports = async (req, res) => {
  try {
    const { timeframe, search } = req.query;
    const role = req.user.role;
    const userId = req.user._id;

    // ─── 1. Date-range filter ────────────────────────────────────────────────
    let dateFilter = {};
    if (timeframe === 'week') {
      dateFilter.eventDate = {
        $gte: moment().subtract(7, 'days').startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      };
    } else if (timeframe === 'month') {
      dateFilter.eventDate = {
        $gte: moment().subtract(30, 'days').startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      };
    }

    // ─── 2. Hall-scope filter (admin sees only their halls) ──────────────────
    let hallFilter = {};
    if (role === 'admin') {
      const myHalls = await Hall.find({ createdBy: userId, isActive: true }).select('_id');
      if (myHalls.length === 0) {
        return res.json({
          success: true,
          count: 0,
          summary: { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 },
          data: []
        });
      }
      hallFilter.hall = { $in: myHalls.map(h => h._id) };
    }
    // superadmin → no hall restriction

    // ─── 3. Search filter (case-insensitive, event name) ────────────────────
    let searchFilter = {};
    if (search && search.trim()) {
      searchFilter.programmeName = { $regex: search.trim(), $options: 'i' };
    }

    // ─── 4. Combine & query ─────────────────────────────────────────────────
    const filter = { ...hallFilter, ...dateFilter, ...searchFilter };

    const bookings = await Booking.find(filter)
      .populate('hall', 'name number location')
      .populate('requestedBy', 'name email department')
      .populate('respondedBy', 'name')
      .sort({ eventDate: -1, createdAt: -1 });

    // ─── 5. Summary counts ───────────────────────────────────────────────────
    const summary = bookings.reduce(
      (acc, b) => {
        acc.total++;
        const key = b.status.toLowerCase(); // approved / pending / rejected / cancelled
        if (acc[key] !== undefined) acc[key]++;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }
    );

    res.json({
      success: true,
      count: bookings.length,
      summary,
      data: bookings
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch reports'
    });
  }
};

module.exports = { getReports };
