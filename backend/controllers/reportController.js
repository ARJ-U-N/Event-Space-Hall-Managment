const Booking = require('../models/Booking');
const Hall = require('../models/Hall');
const moment = require('moment');

// @route   GET /api/bookings/reports
// @access  Private (admin, superadmin)
const getReports = async (req, res) => {
  try {
    const { timeframe, search, status, hallId, startDate, endDate } = req.query;
    const role   = req.user.role;
    const userId = req.user._id;

    // ─── 1. Hall-scope filter (admin sees only their own halls) ─────────────
    let allowedHallIds = null; // null = superadmin (no restriction)

    if (role === 'admin') {
      const myHalls = await Hall.find({ createdBy: userId, isActive: true }).select('_id name number');
      if (myHalls.length === 0) {
        return res.json({
          success: true,
          count: 0,
          summary: { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 },
          halls: [],
          data: []
        });
      }
      allowedHallIds = myHalls.map(h => h._id);
    }

    // ─── 2. Build query dynamically ─────────────────────────────────────────
    const filter = {};

    // Hall scope
    if (allowedHallIds !== null) {
      // Admin: constrain to their halls, optionally narrowed by hallId param
      if (hallId) {
        const requestedId = hallId.trim();
        const isAllowed = allowedHallIds.some(id => id.toString() === requestedId);
        if (!isAllowed) {
          return res.status(403).json({ success: false, message: 'Hall not managed by you' });
        }
        filter.hall = requestedId;
      } else {
        filter.hall = { $in: allowedHallIds };
      }
    } else {
      // Superadmin: can optionally filter by any hallId
      if (hallId) filter.hall = hallId.trim();
    }

    // Status filter
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
    if (status && validStatuses.includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    // Date filter — specific startDate/endDate takes precedence over timeframe
    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) filter.eventDate.$gte = moment(startDate).startOf('day').toDate();
      if (endDate)   filter.eventDate.$lte = moment(endDate).endOf('day').toDate();
    } else if (timeframe === 'week') {
      filter.eventDate = {
        $gte: moment().subtract(7, 'days').startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      };
    } else if (timeframe === 'month') {
      filter.eventDate = {
        $gte: moment().subtract(30, 'days').startOf('day').toDate(),
        $lte: moment().endOf('day').toDate()
      };
    }

    // Text search on event name
    if (search && search.trim()) {
      filter.programmeName = { $regex: search.trim(), $options: 'i' };
    }

    // ─── 3. Execute query ────────────────────────────────────────────────────
    const bookings = await Booking.find(filter)
      .populate('hall', 'name number location')
      .populate('requestedBy', 'name email department')
      .populate('respondedBy', 'name')
      .sort({ eventDate: -1, createdAt: -1 });

    // ─── 4. Summary counts (reflect current filters) ─────────────────────────
    const summary = bookings.reduce(
      (acc, b) => {
        acc.total++;
        const key = b.status.toLowerCase();
        if (acc[key] !== undefined) acc[key]++;
        return acc;
      },
      { total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 }
    );

    // ─── 5. Return unique halls list for frontend dropdown ───────────────────
    const hallsMap = new Map();
    bookings.forEach(b => {
      if (b.hall && !hallsMap.has(b.hall._id.toString())) {
        hallsMap.set(b.hall._id.toString(), { _id: b.hall._id, name: b.hall.name, number: b.hall.number });
      }
    });
    const halls = Array.from(hallsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      count: bookings.length,
      summary,
      halls,
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
