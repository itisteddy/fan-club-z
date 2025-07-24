import express from 'express';
import { Request, Response } from 'express';

const router = express.Router();

// Mock data - replace with your actual database calls
let clubs = [
  {
    id: 'club-1',
    name: 'Crypto Bulls',
    description: 'Betting on cryptocurrency prices and market movements',
    category: 'crypto',
    creatorId: 'user-1',
    memberCount: 892,
    activeBets: 15,
    discussions: 23,
    isPrivate: false,
    createdAt: new Date('2025-06-20T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-07-04T12:00:00Z').toISOString()
  },
  {
    id: 'club-2',
    name: 'Premier League Predictors',
    description: 'The ultimate destination for Premier League betting and predictions',
    category: 'sports',
    creatorId: 'demo-user-id',
    memberCount: 1247,
    activeBets: 8,
    discussions: 45,
    isPrivate: false,
    createdAt: new Date('2025-06-15T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-07-04T15:45:00Z').toISOString()
  }
];

let clubMembers: any[] = [];

// Get all clubs
router.get('/clubs', (req: Request, res: Response) => {
  try {
    const publicClubs = clubs.map(club => ({
      ...club,
      memberCount: clubMembers.filter(member => member.clubId === club.id).length || club.memberCount
    }));
    
    res.json({
      success: true,
      data: { clubs: publicClubs }
    });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch clubs' 
    });
  }
});

// Get specific club
router.get('/clubs/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const club = clubs.find(c => c.id === id);
    
    if (!club) {
      return res.status(404).json({ 
        success: false, 
        error: 'Club not found' 
      });
    }

    const memberCount = clubMembers.filter(member => member.clubId === id).length || club.memberCount;
    
    res.json({
      success: true,
      data: {
        club: {
          ...club,
          memberCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching club:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch club' 
    });
  }
});

// Join club - FIXED FUNCTIONALITY
router.post('/clubs/:id/join', (req: Request, res: Response) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.body?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Check if club exists
    const club = clubs.find(c => c.id === clubId);
    if (!club) {
      return res.status(404).json({ 
        success: false, 
        error: 'Club not found' 
      });
    }

    // Check if already a member
    const existingMembership = clubMembers.find(
      member => member.clubId === clubId && member.userId === userId
    );
    
    if (existingMembership) {
      return res.status(400).json({ 
        success: false, 
        error: 'Already a member of this club' 
      });
    }

    // Create new membership
    const newMembership = {
      id: `membership-${Date.now()}`,
      clubId,
      userId,
      role: 'member',
      joinedAt: new Date().toISOString()
    };

    clubMembers.push(newMembership);

    res.status(201).json({
      success: true,
      message: 'Successfully joined club',
      data: { membership: newMembership }
    });
  } catch (error) {
    console.error('Error joining club:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to join club' 
    });
  }
});

// Leave club - FIXED FUNCTIONALITY
router.post('/clubs/:id/leave', (req: Request, res: Response) => {
  try {
    const { id: clubId } = req.params;
    const userId = req.body?.userId || (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Check if club exists
    const club = clubs.find(c => c.id === clubId);
    if (!club) {
      return res.status(404).json({ 
        success: false, 
        error: 'Club not found' 
      });
    }

    // Find membership
    const membershipIndex = clubMembers.findIndex(
      member => member.clubId === clubId && member.userId === userId
    );
    
    if (membershipIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'You are not a member of this club' 
      });
    }

    // Remove membership
    clubMembers.splice(membershipIndex, 1);

    res.json({
      success: true,
      message: 'Successfully left club',
      data: { clubId, userId }
    });
  } catch (error) {
    console.error('Error leaving club:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to leave club' 
    });
  }
});

// Get user's club memberships
router.get('/clubs/user/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const userMemberships = clubMembers.filter(member => member.userId === userId);
    const userClubs = userMemberships.map(membership => {
      const club = clubs.find(c => c.id === membership.clubId);
      return club;
    }).filter(Boolean);
    
    res.json({
      success: true,
      data: { clubs: userClubs }
    });
  } catch (error) {
    console.error('Error fetching user clubs:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user clubs' 
    });
  }
});

export default router;