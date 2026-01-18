// Cloudflare Worker for TheCenti Live Hub
// This handles real-time state management and WebSocket connections

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (url.pathname === '/api/state') {
        return handleStateAPI(request, env, corsHeaders);
      } else if (url.pathname === '/api/vote') {
        return handleVoteAPI(request, env, corsHeaders);
      } else if (url.pathname === '/api/ai') {
        return handleAIAPI(request, env, corsHeaders);
      } else if (url.pathname === '/api/ai/current') {
        return handleAICurrentAPI(request, env, corsHeaders);
      } else if (url.pathname === '/ws') {
        return handleWebSocket(request, env);
      }

      // Serve static files (fallback to GitHub Pages)
      return Response.redirect('https://giobi.github.io/thecenti' + url.pathname, 302);

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

// State Management API
async function handleStateAPI(request, env, corsHeaders) {
  const method = request.method;

  if (method === 'GET') {
    // Get current state
    const currentState = await env.LIVE_STATE.get('current', 'json') || {
      voteOpen: false,
      aiEnabled: false,
      currentVote: null,
      lastUpdate: Date.now()
    };

    return new Response(JSON.stringify(currentState), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    // Update state
    const body = await request.json();
    const currentState = await env.LIVE_STATE.get('current', 'json') || {};
    
    const newState = {
      ...currentState,
      ...body,
      lastUpdate: Date.now()
    };

    await env.LIVE_STATE.put('current', JSON.stringify(newState));

    // Broadcast update to all connected WebSocket clients
    await broadcastStateUpdate(env, newState);

    return new Response(JSON.stringify(newState), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}

// Vote Management API
async function handleVoteAPI(request, env, corsHeaders) {
  const method = request.method;

  if (method === 'GET') {
    // Get current vote results
    const voteData = await env.LIVE_STATE.get('vote_results', 'json') || {
      songs: [],
      votes: {},
      totalVotes: 0
    };

    return new Response(JSON.stringify(voteData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    const body = await request.json();
    
    if (body.action === 'vote') {
      // Submit a vote
      const voteData = await env.LIVE_STATE.get('vote_results', 'json') || {
        songs: ['Canzone 1', 'Canzone 2', 'Canzone 3'],
        votes: {},
        totalVotes: 0
      };

      const { songIndex, clientId } = body;
      
      // Check if voting is open
      const currentState = await env.LIVE_STATE.get('current', 'json') || {};
      if (!currentState.voteOpen) {
        return new Response(JSON.stringify({ 
          error: 'Voting is closed' 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Prevent duplicate voting (basic check by clientId)
      if (voteData.votes[clientId]) {
        return new Response(JSON.stringify({ 
          error: 'Already voted',
          previousVote: voteData.votes[clientId]
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Record the vote
      voteData.votes[clientId] = {
        songIndex: songIndex,
        timestamp: Date.now()
      };
      voteData.totalVotes++;

      await env.LIVE_STATE.put('vote_results', JSON.stringify(voteData));

      // Calculate and broadcast results
      const results = calculateVoteResults(voteData);
      await broadcastVoteUpdate(env, results);

      return new Response(JSON.stringify({ 
        success: true,
        results: results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'start_vote') {
      // Start new voting session
      const voteData = {
        songs: body.songs || ['Albachiara', 'Vita Spericolata', 'Sally'],
        votes: {},
        totalVotes: 0,
        startTime: Date.now()
      };

      await env.LIVE_STATE.put('vote_results', JSON.stringify(voteData));
      
      // Update global state
      const currentState = await env.LIVE_STATE.get('current', 'json') || {};
      currentState.voteOpen = true;
      currentState.currentVote = voteData;
      await env.LIVE_STATE.put('current', JSON.stringify(currentState));

      await broadcastStateUpdate(env, currentState);

      return new Response(JSON.stringify({ 
        success: true,
        vote: voteData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'close_vote') {
      // Close voting
      const currentState = await env.LIVE_STATE.get('current', 'json') || {};
      currentState.voteOpen = false;
      await env.LIVE_STATE.put('current', JSON.stringify(currentState));

      await broadcastStateUpdate(env, currentState);

      return new Response(JSON.stringify({ 
        success: true,
        state: currentState
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { 
    status: 405, 
    headers: corsHeaders 
  });
}

// AI Request Management API
async function handleAIAPI(request, env, corsHeaders) {
  const method = request.method;

  if (method === 'GET') {
    // Get AI request queue
    const queueData = await env.LIVE_STATE.get('ai_queue', 'json') || {
      requests: [],
      approved: [],
      rejected: []
    };

    return new Response(JSON.stringify(queueData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (method === 'POST') {
    const body = await request.json();
    
    if (body.action === 'submit_request') {
      // Submit new AI request
      console.log('[DEBUG] Received submit_request:', body);

      const currentState = await env.LIVE_STATE.get('current', 'json') || {};

      if (!currentState.aiEnabled) {
        return new Response(JSON.stringify({
          error: 'AI requests are disabled'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const queueData = await env.LIVE_STATE.get('ai_queue', 'json') || {
        requests: [],
        approved: [],
        rejected: []
      };

      const newRequest = {
        id: crypto.randomUUID(),
        dedicatedTo: body.dedicatedTo || 'N/A',
        occasion: body.occasion || 'N/A',
        personality: Array.isArray(body.personality) ? body.personality : (body.personality ? body.personality.split(',').map(p => p.trim()) : []),
        story: body.story || '',
        email: body.email || '',
        userName: body.userName || 'Anonimo',
        timestamp: Date.now(),
        status: 'pending'
      };

      console.log('[DEBUG] Created new request:', newRequest);

      queueData.requests.push(newRequest);
      await env.LIVE_STATE.put('ai_queue', JSON.stringify(queueData));

      // Broadcast to dashboard
      await broadcastAIUpdate(env, queueData);

      return new Response(JSON.stringify({ 
        success: true,
        request: newRequest
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'approve_request' || body.action === 'reject_request') {
      // Admin approve/reject request
      const queueData = await env.LIVE_STATE.get('ai_queue', 'json') || {
        requests: [],
        approved: [],
        rejected: []
      };

      const requestId = body.requestId;
      const requestIndex = queueData.requests.findIndex(r => r.id === requestId);
      
      if (requestIndex === -1) {
        return new Response(JSON.stringify({ 
          error: 'Request not found' 
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const request = queueData.requests[requestIndex];
      queueData.requests.splice(requestIndex, 1);

      if (body.action === 'approve_request') {
        request.status = 'approved';
        queueData.approved.push(request);
      } else {
        request.status = 'rejected';
        queueData.rejected.push(request);
      }

      await env.LIVE_STATE.put('ai_queue', JSON.stringify(queueData));
      await broadcastAIUpdate(env, queueData);

      return new Response(JSON.stringify({
        success: true,
        request: request
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'generate_song') {
      // Generate song using Gemini API
      const requestId = body.requestId;
      console.log('[DEBUG] Generate song request for:', requestId);

      const queueData = await env.LIVE_STATE.get('ai_queue', 'json') || {
        requests: [],
        approved: [],
        rejected: []
      };

      console.log('[DEBUG] Queue data:', {
        approved: queueData.approved.length,
        requests: queueData.requests.length
      });

      // Find request in approved list
      const approvedRequest = queueData.approved.find(r => r.id === requestId);
      if (!approvedRequest) {
        console.error('[ERROR] Request not found in approved list. RequestId:', requestId);
        return new Response(JSON.stringify({
          error: 'Request not found in approved list',
          requestId: requestId,
          approvedCount: queueData.approved.length
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('[DEBUG] Found approved request:', {
        id: approvedRequest.id,
        dedicatedTo: approvedRequest.dedicatedTo,
        occasion: approvedRequest.occasion
      });

      try {
        // Call Gemini API to generate song
        console.log('[DEBUG] Calling Gemini API...');
        const generatedSong = await callGeminiAPI(approvedRequest, env);
        console.log('[DEBUG] Gemini returned:', generatedSong);

        // Save to generated songs KV
        const songsData = await env.LIVE_STATE.get('ai_generated_songs', 'json') || { songs: [] };

        const newSong = {
          id: crypto.randomUUID(),
          requestId: requestId,
          generatedAt: Date.now(),
          status: 'generated',
          dedicatedTo: approvedRequest.dedicatedTo,
          occasion: approvedRequest.occasion,
          ...generatedSong
        };

        songsData.songs.push(newSong);
        await env.LIVE_STATE.put('ai_generated_songs', JSON.stringify(songsData));

        console.log('[DEBUG] Song saved. Total songs:', songsData.songs.length);

        return new Response(JSON.stringify({
          success: true,
          song: newSong
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('[ERROR] Song generation failed:', error);
        return new Response(JSON.stringify({
          error: 'Song generation failed',
          message: error.message,
          stack: error.stack
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (body.action === 'set_current_song') {
      // Set a generated song as current
      const songId = body.songId;
      const songsData = await env.LIVE_STATE.get('ai_generated_songs', 'json') || { songs: [] };

      const song = songsData.songs.find(s => s.id === songId);
      if (!song) {
        return new Response(JSON.stringify({
          error: 'Song not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update song status
      song.status = 'active';
      await env.LIVE_STATE.put('ai_generated_songs', JSON.stringify(songsData));

      // Update current state
      const currentState = await env.LIVE_STATE.get('current', 'json') || {};
      currentState.currentAISong = {
        id: song.id,
        title: song.lyrics.title,
        dedicatedTo: song.dedicatedTo,
        lyrics: song.lyrics
      };
      await env.LIVE_STATE.put('current', JSON.stringify(currentState));

      await broadcastStateUpdate(env, currentState);

      return new Response(JSON.stringify({
        success: true,
        currentSong: currentState.currentAISong
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'mark_played') {
      // Mark song as played
      const songId = body.songId;
      const songsData = await env.LIVE_STATE.get('ai_generated_songs', 'json') || { songs: [] };

      const song = songsData.songs.find(s => s.id === songId);
      if (!song) {
        return new Response(JSON.stringify({
          error: 'Song not found'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Update song status
      song.status = 'played';
      song.playedAt = Date.now();
      await env.LIVE_STATE.put('ai_generated_songs', JSON.stringify(songsData));

      // Clear current AI song from state
      const currentState = await env.LIVE_STATE.get('current', 'json') || {};
      if (currentState.currentAISong && currentState.currentAISong.id === songId) {
        currentState.currentAISong = null;
        await env.LIVE_STATE.put('current', JSON.stringify(currentState));
        await broadcastStateUpdate(env, currentState);
      }

      return new Response(JSON.stringify({
        success: true,
        song: song
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (body.action === 'list_generated_songs') {
      // List all generated songs
      const songsData = await env.LIVE_STATE.get('ai_generated_songs', 'json') || { songs: [] };

      return new Response(JSON.stringify({
        success: true,
        songs: songsData.songs
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders
  });
}

// WebSocket handling for real-time updates
async function handleWebSocket(request, env) {
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();

  // Store connection in Durable Object for broadcasting
  // For now, we'll handle basic connection
  server.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'ping') {
        server.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  server.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}

// Utility Functions
function calculateVoteResults(voteData) {
  const songCounts = {};
  const songNames = voteData.songs;

  // Initialize counts
  songNames.forEach((song, index) => {
    songCounts[index] = 0;
  });

  // Count votes
  Object.values(voteData.votes).forEach(vote => {
    if (songCounts.hasOwnProperty(vote.songIndex)) {
      songCounts[vote.songIndex]++;
    }
  });

  // Calculate percentages and create results
  const results = songNames.map((name, index) => {
    const votes = songCounts[index] || 0;
    const percentage = voteData.totalVotes > 0 ? 
      Math.round((votes / voteData.totalVotes) * 100) : 0;
    
    return {
      name: name,
      votes: votes,
      percentage: percentage
    };
  });

  return {
    results: results,
    totalVotes: voteData.totalVotes,
    lastUpdate: Date.now()
  };
}

// Broadcast functions (simplified - in production would use Durable Objects)
async function broadcastStateUpdate(env, state) {
  // Store the latest state for polling clients
  await env.LIVE_STATE.put('latest_state', JSON.stringify(state));
  
  // In a full implementation, this would broadcast to all WebSocket connections
  console.log('Broadcasting state update:', state);
}

async function broadcastVoteUpdate(env, results) {
  await env.LIVE_STATE.put('latest_vote', JSON.stringify(results));
  console.log('Broadcasting vote update:', results);
}

async function broadcastAIUpdate(env, queueData) {
  await env.LIVE_STATE.put('latest_ai', JSON.stringify(queueData));
  console.log('Broadcasting AI update:', queueData);
}

// AI Current Song API - optimized for public page polling
async function handleAICurrentAPI(request, env, corsHeaders) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const currentState = await env.LIVE_STATE.get('current', 'json') || {};
    const currentSong = currentState.currentAISong || null;

    return new Response(JSON.stringify({
      currentSong: currentSong
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to fetch current song',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Gemini API call for song generation
async function callGeminiAPI(request, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Build prompt
  const systemPrompt = `Sei songwriter per TheCenti, cover band italiana rock/pop.
Scrivi canzoni personalizzate in italiano basate sulle informazioni fornite.

Struttura obbligatoria:
- verse1 (strofa 1): 4 linee
- chorus (ritornello): 4 linee
- verse2 (strofa 2): 4 linee
- bridge (ponte): 4 linee
- finalChorus (ritornello finale): 4 linee

Ogni linea MAX 60 caratteri per leggibilità live.
Output SOLO JSON valido, nessun altro testo.

Formato output:
{
  "lyrics": {
    "title": "Titolo Canzone",
    "verse1": ["linea1", "linea2", "linea3", "linea4"],
    "chorus": ["linea1", "linea2", "linea3", "linea4"],
    "verse2": ["linea1", "linea2", "linea3", "linea4"],
    "bridge": ["linea1", "linea2", "linea3", "linea4"],
    "finalChorus": ["linea1", "linea2", "linea3", "linea4"]
  },
  "genre": "rock-italiano",
  "mood": "divertente"
}`;

  const userPrompt = `Crea canzone per:

DEDICATA A: ${request.dedicatedTo}
OCCASIONE: ${request.occasion}
PERSONALITÀ: ${request.personality.join(', ')}
STORIA/ANEDDOTO: ${request.story}

Crea una canzone divertente, memorabile e personalizzata. Usa dettagli dalla storia per rendere il testo unico.`;

  // Call Gemini API
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: systemPrompt + '\n\n' + userPrompt
        }]
      }],
      generationConfig: {
        temperature: 1.0,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  // Extract generated content
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Invalid Gemini API response structure');
  }

  const generatedText = data.candidates[0].content.parts[0].text;

  // Parse JSON response
  try {
    const songData = JSON.parse(generatedText);
    return songData;
  } catch (parseError) {
    throw new Error(`Failed to parse Gemini response as JSON: ${parseError.message}`);
  }
}

// Export for testing
export { calculateVoteResults, handleStateAPI, handleVoteAPI, handleAIAPI, handleAICurrentAPI, callGeminiAPI };