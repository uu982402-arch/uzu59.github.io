/* Slot tool v58 — Pragmatic DB++ (add/import/fav/tags) + session tracker */
(function(){
  'use strict';

  const TAB_KEY = '88st_slot_tab_v1';
  const SESS_KEY = '88st_slot_sessions_v1';
  const DB_KEY  = '88st_slot_db_v58';
  const FAV_KEY = '88st_slot_fav_v1';

  const $ = (id)=>document.getElementById(id);

  function safeJsonParse(s, fallback){
    try{ return JSON.parse(s); }catch(_){ return fallback; }
  }
  function lsRead(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return v ? safeJsonParse(v, fallback) : fallback;
    }catch(_){ return fallback; }
  }
  function lsWrite(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(_){ /* ignore */ }
  }

  function num(v){
    const s = String(v ?? '').replace(/,/g,'').replace(/원/g,'').trim();
    if(!s) return NaN;
    const x = Number(s);
    return Number.isFinite(x) ? x : NaN;
  }
  function fmtWon(x){
    if(!Number.isFinite(x)) return '-';
    return Math.round(x).toLocaleString('ko-KR') + '원';
  }
  function fmtX(x){
    if(!Number.isFinite(x) || x<=0) return '—';
    return Math.round(x).toLocaleString('en-US') + 'x';
  }
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }

  function esc(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  const VOL_LABEL = { low:'저변동', mid:'중변동', high:'고변동', vhigh:'초고변동', unknown:'미표기' };

  // Default seed DB — lightweight but extensible.
  // NOTE: RTP can vary by operator/version; keep null unless verified.
  const DEFAULT_DB = [
    { id:'pp_gates_olympus', provider:'Pragmatic', name:'Gates of Olympus', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_sweet_bonanza', provider:'Pragmatic', name:'Sweet Bonanza', vol:'high', maxWin:21100, rtp:null },
    { id:'pp_dog_house', provider:'Pragmatic', name:'The Dog House', vol:'high', maxWin:6750, rtp:null },
    { id:'pp_big_bass_bonanza', provider:'Pragmatic', name:'Big Bass Bonanza', vol:'high', maxWin:2100, rtp:null },
    { id:'pp_sugar_rush', provider:'Pragmatic', name:'Sugar Rush', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_starlight_princess', provider:'Pragmatic', name:'Starlight Princess', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_fruit_party', provider:'Pragmatic', name:'Fruit Party', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_power_thor_megaways', provider:'Pragmatic', name:'Power of Thor Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_jokers_jewels', provider:'Pragmatic', name:"Joker's Jewels", vol:'low', maxWin:1000, rtp:null },
    { id:'pp_5lions_megaways', provider:'Pragmatic', name:'5 Lions Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_aztec_gems', provider:'Pragmatic', name:'Aztec Gems', vol:'low', maxWin:405, rtp:null },
    { id:'pp_madame_destiny', provider:'Pragmatic', name:'Madame Destiny Megaways', vol:'high', maxWin:5000, rtp:null, tags:['megaways'] },
    { id:'pp_great_rhino_megaways', provider:'Pragmatic', name:'Great Rhino Megaways', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_fire_strike_2', provider:'Pragmatic', name:'Fire Strike 2', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_wolf_gold', provider:'Pragmatic', name:'Wolf Gold', vol:'mid', maxWin:2500, rtp:null },
    { id:'pp_john_hunter_scarab', provider:'Pragmatic', name:'John Hunter and the Tomb of the Scarab Queen', vol:'mid', maxWin:1250, rtp:null },
    { id:'pp_mustang_gold', provider:'Pragmatic', name:'Mustang Gold', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_release_kraken', provider:'Pragmatic', name:'Release the Kraken', vol:'mid', maxWin:5000, rtp:null },
    { id:'pp_rise_giza', provider:'Pragmatic', name:'Rise of Giza PowerNudge', vol:'high', maxWin:5000, rtp:null },
    { id:'pp_sweet_bonanza_1000', provider:'Pragmatic', name:'Sweet Bonanza 1000', vol:'vhigh', maxWin:null, rtp:null, tags:['buy-feature'] },
    { id:'pp_sugar_rush_1000', provider:'Pragmatic', name:'Sugar Rush 1000', vol:'vhigh', maxWin:null, rtp:null, tags:['buy-feature'] },
    { id:'pp_big_bass_splash', provider:'Pragmatic', name:'Big Bass Splash', vol:'high', maxWin:null, rtp:null, tags:['big-bass'] },
    { id:'pp_big_bass_hold_spinner', provider:'Pragmatic', name:'Big Bass Hold & Spinner', vol:'high', maxWin:null, rtp:null, tags:['big-bass'] },
    { id:'pp_big_bass_reel_riches', provider:'Pragmatic', name:'Big Bass Reel Riches', vol:'high', maxWin:null, rtp:null, tags:['big-bass'] },
    { id:'pp_thetomb', provider:'Pragmatic', name:"John Hunter and the Book of Tut", vol:'mid', maxWin:null, rtp:null },
    { id:'pp_7clovers', provider:'Pragmatic', name:'7 Clovers of Fortune', vol:'mid', maxWin:null, rtp:null },
    { id:'pp_hotfiesta', provider:'Pragmatic', name:'Hot Fiesta', vol:'mid', maxWin:null, rtp:null },
    { id:'pp_chilli_heat', provider:'Pragmatic', name:'Chilli Heat', vol:'mid', maxWin:null, rtp:null },
    { id:'pp_hand_midas', provider:'Pragmatic', name:"Hand of Midas", vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_kois_fortune', provider:'Pragmatic', name:"Koi's Fortune", vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_machines_777', provider:'Pragmatic', name:'Hot to Burn Hold and Spin', vol:'unknown', maxWin:null, rtp:null, tags:['hold-and-spin'] },
    { id:'pp_gems_bonanza', provider:'Pragmatic', name:'Gems Bonanza', vol:'high', maxWin:null, rtp:null, tags:['cluster'] },
    { id:'pp_candy_blitz', provider:'Pragmatic', name:'Candy Blitz', vol:'unknown', maxWin:null, rtp:null, tags:['cluster'] },
    { id:'pp_santa_great_gifts', provider:'Pragmatic', name:"Santa's Great Gifts", vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_floating_dragon', provider:'Pragmatic', name:'Floating Dragon', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_barn_festival', provider:'Pragmatic', name:'Barn Festival', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_cash_bonanza', provider:'Pragmatic', name:'Cash Bonanza', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_bigger_bass_blizzard', provider:'Pragmatic', name:'Bigger Bass Blizzard', vol:'high', maxWin:null, rtp:null, tags:['big-bass'] },
    { id:'pp_bronco_spirit', provider:'Pragmatic', name:'Bronco Spirit', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_leprechaun_riches', provider:'Pragmatic', name:'Leprechaun Riches', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_rock_vegas', provider:'Pragmatic', name:'Rock Vegas', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_wild_west_gold', provider:'Pragmatic', name:'Wild West Gold', vol:'mid', maxWin:null, rtp:null },
    { id:'pp_heart_cleopatra', provider:'Pragmatic', name:'Heart of Cleopatra', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_fury_of_odin', provider:'Pragmatic', name:'Fury of Odin Megaways', vol:'high', maxWin:null, rtp:null, tags:['megaways'] },
    { id:'pp_mysterious_egypt', provider:'Pragmatic', name:'Mysterious Egypt', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_pirate_gold', provider:'Pragmatic', name:'Pirate Gold Deluxe', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_piggy_bank_bills', provider:'Pragmatic', name:'Piggy Bank Bills', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_the_dog_house_megaways', provider:'Pragmatic', name:'The Dog House Megaways', vol:'high', maxWin:null, rtp:null, tags:['megaways'] },
    { id:'pp_rocky_rockstar', provider:'Pragmatic', name:'Rocky RockStar', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_better_wilds', provider:'Pragmatic', name:'Extra Juicy', vol:'low', maxWin:null, rtp:null },
    { id:'pp_ancient_gems', provider:'Pragmatic', name:'Ancient Egypt Classic', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_money_mouse', provider:'Pragmatic', name:'Money Mouse', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_dragon_hero', provider:'Pragmatic', name:'Dragon Hero', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_cash_patrol', provider:'Pragmatic', name:'Cash Patrol', vol:'unknown', maxWin:null, rtp:null },
    { id:'pp_5lions_gold', provider:'Pragmatic', name:'5 Lions Gold', vol:'high', maxWin:null, rtp:null },
    { id:'pp_5lions_dance', provider:'Pragmatic', name:'5 Lions Dance', vol:'high', maxWin:null, rtp:null },
    { id:'pp_golden_pig', provider:'Pragmatic', name:'Golden Pig', vol:'unknown', maxWin:null, rtp:null },

    // --- Expanded seed (v87): Pragmatic + Nolimit City ---,
    { id:'pp_cult', provider:'Pragmatic', name:'CULT', vol:'vhigh', maxWin:null, rtp:96.51 },
    { id:'pp_luckys_wild_pub_2', provider:'Pragmatic', name:'Lucky’s Wild Pub 2', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_tuts_treasure_tower', provider:'Pragmatic', name:'Tut’s Treasure Tower', vol:'high', maxWin:null, rtp:96.51 },
    { id:'pp_haunted_crypt', provider:'Pragmatic', name:'Haunted Crypt', vol:'vhigh', maxWin:null, rtp:96.51 },
    { id:'pp_rolling_in_treasures', provider:'Pragmatic', name:'Rolling in Treasures', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_mummys_jewels_100', provider:'Pragmatic', name:'Mummy’s Jewels 100', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_treasures_of_osiris', provider:'Pragmatic', name:'Treasures of Osiris', vol:'vhigh', maxWin:null, rtp:96.52 },
    { id:'pp_emerald_king_wheel_of_wealth', provider:'Pragmatic', name:'Emerald King – Wheel of Wealth', vol:'vhigh', maxWin:null, rtp:96.53 },
    { id:'pp_lucky_tiger_gold', provider:'Pragmatic', name:'Lucky Tiger Gold', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_knights_vs_barbarians', provider:'Pragmatic', name:'Knights vs Barbarians', vol:'vhigh', maxWin:null, rtp:96.51 },
    { id:'pp_fire_stampede_ultimate', provider:'Pragmatic', name:'Fire Stampede Ultimate', vol:'vhigh', maxWin:null, rtp:96.45 },
    { id:'pp_3_magic_eggs', provider:'Pragmatic', name:'3 Magic Eggs', vol:'high', maxWin:null, rtp:96.51 },
    { id:'pp_zeus_vs_hades_gods_of_war_250', provider:'Pragmatic', name:'Zeus vs Hades – Gods of War 250', vol:'vhigh', maxWin:null, rtp:96.56 },
    { id:'pp_cyberheist_city', provider:'Pragmatic', name:'Cyberheist City', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_super_tiki_strike', provider:'Pragmatic', name:'Super Tiki Strike', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_sweet_burst', provider:'Pragmatic', name:'Sweet Burst', vol:'high', maxWin:null, rtp:96.52 },
    { id:'pp_dragon_tiger_fortunes', provider:'Pragmatic', name:'Dragon Tiger Fortunes', vol:'vhigh', maxWin:null, rtp:96.54 },
    { id:'pp_floating_dragon_wild_horses', provider:'Pragmatic', name:'Floating Dragon Wild Horses', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_sugar_rush_super_scatter', provider:'Pragmatic', name:'Sugar Rush Super Scatter', vol:'vhigh', maxWin:null, rtp:96.58 },
    { id:'pp_lucky_fortune_tree', provider:'Pragmatic', name:'Lucky Fortune Tree', vol:'mid', maxWin:null, rtp:96.50 },
    { id:'pp_hot_tuna', provider:'Pragmatic', name:'Hot Tuna', vol:'high', maxWin:null, rtp:96.53 },
    { id:'pp_wheel_of_happiness', provider:'Pragmatic', name:'Wheel of Happiness', vol:'high', maxWin:null, rtp:96.47 },
    { id:'pp_jokers_jewels_hold_and_spin', provider:'Pragmatic', name:'Joker’s Jewels Hold & Spin', vol:'vhigh', maxWin:null, rtp:96.52 },
    { id:'pp_dj_neko', provider:'Pragmatic', name:'DJ Neko', vol:'mid', maxWin:null, rtp:96.50 },
    { id:'pp_anaconda_gold', provider:'Pragmatic', name:'Anaconda Gold', vol:'vhigh', maxWin:null, rtp:96.54 },
    { id:'pp_fortune_of_olympus', provider:'Pragmatic', name:'Fortune of Olympus', vol:'vhigh', maxWin:null, rtp:96.55 },
    { id:'pp_hammerstorm', provider:'Pragmatic', name:'Hammerstorm', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_lucky_panda', provider:'Pragmatic', name:'Lucky Panda', vol:'mid', maxWin:null, rtp:96.50 },
    { id:'pp_big_bass_splash_1000', provider:'Pragmatic', name:'Big Bass Splash 1000', vol:'vhigh', maxWin:null, rtp:96.52 },
    { id:'pp_bloody_dawn', provider:'Pragmatic', name:'Bloody Dawn', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_sweet_craze', provider:'Pragmatic', name:'Sweet Craze', vol:'high', maxWin:null, rtp:96.54 },
    { id:'pp_wisdom_of_athena_1000_xmas', provider:'Pragmatic', name:'Wisdom of Athena 1000 Xmas', vol:'vhigh', maxWin:null, rtp:96.00 },
    { id:'pp_big_bass_christmas_frozen_lake', provider:'Pragmatic', name:'Big Bass Christmas – Frozen Lake', vol:'vhigh', maxWin:null, rtp:96.07 },
    { id:'pp_happy_nets', provider:'Pragmatic', name:'Happy Nets', vol:'high', maxWin:null, rtp:96.50 },
    { id:'pp_zeus_vs_typhon', provider:'Pragmatic', name:'Zeus vs Typhon', vol:'vhigh', maxWin:null, rtp:96.49 },
    { id:'pp_santas_slay', provider:'Pragmatic', name:'Santa’s Slay', vol:'vhigh', maxWin:null, rtp:96.53 },
    { id:'pp_super_gummy_strike', provider:'Pragmatic', name:'Super Gummy Strike', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_duel_of_night_and_day', provider:'Pragmatic', name:'Duel of Night & Day', vol:'high', maxWin:null, rtp:96.47 },
    { id:'pp_lucky_dice', provider:'Pragmatic', name:'Lucky Dice', vol:'mid', maxWin:null, rtp:96.53 },
    { id:'pp_wild_wild_riches_returns', provider:'Pragmatic', name:'Wild Wild Riches Returns', vol:'mid', maxWin:null, rtp:96.50 },
    { id:'pp_oracle_of_gold', provider:'Pragmatic', name:'Oracle of Gold', vol:'vhigh', maxWin:null, rtp:96.55 },
    { id:'pp_starlight_princess_super_scatter', provider:'Pragmatic', name:'Starlight Princess Super Scatter', vol:'vhigh', maxWin:null, rtp:96.50 },
    { id:'pp_mystic_wishes', provider:'Pragmatic', name:'Mystic Wishes', vol:'low', maxWin:null, rtp:96.50 },
    { id:'pp_pandemic_rising', provider:'Pragmatic', name:'Pandemic Rising', vol:'vhigh', maxWin:null, rtp:96.51 },
    { id:'pp_frightening_frankie', provider:'Pragmatic', name:'Frightening Frankie', vol:'vhigh', maxWin:null, rtp:96.53 },
    { id:'nlc_kitchen_drama_sushi_mania', provider:'Nolimit City', name:'Kitchen Drama: Sushi Mania', vol:'mid', maxWin:697, rtp:96.77 },
    { id:'nlc_oktoberfest', provider:'Nolimit City', name:'Oktoberfest', vol:'mid', maxWin:735, rtp:96.73 },
    { id:'nlc_casino_win_spin', provider:'Nolimit City', name:'Casino Win Spin', vol:'mid', maxWin:100, rtp:96.69 },
    { id:'nlc_kitchen_drama_bbq_frenzy', provider:'Nolimit City', name:'Kitchen Drama: Bbq Frenzy', vol:'mid', maxWin:676, rtp:96.67 },
    { id:'nlc_wixx', provider:'Nolimit City', name:'Wixx', vol:'mid', maxWin:7777, rtp:96.63 },
    { id:'nlc_tesla_jolt', provider:'Nolimit City', name:'Tesla Jolt', vol:'vhigh', maxWin:8750, rtp:96.59 },
    { id:'nlc_coins_of_fortune', provider:'Nolimit City', name:'Coins of Fortune', vol:'mid', maxWin:600, rtp:96.56 },
    { id:'nlc_hot_nudge', provider:'Nolimit City', name:'Hot Nudge', vol:'vhigh', maxWin:10000, rtp:96.56 },
    { id:'nlc_dungeon_quest', provider:'Nolimit City', name:'Dungeon Quest', vol:'mid', maxWin:100, rtp:96.55 },
    { id:'nlc_fruits', provider:'Nolimit City', name:'Fruits', vol:'vhigh', maxWin:8520, rtp:96.51 },
    { id:'nlc_owls', provider:'Nolimit City', name:'Owls', vol:'vhigh', maxWin:25273, rtp:96.51 },
    { id:'nlc_dead_men_walking', provider:'Nolimit City', name:'Dead Men Walking', vol:'vhigh', maxWin:20005, rtp:96.50 },
    { id:'nlc_pearl_harbor', provider:'Nolimit City', name:'Pearl Harbor', vol:'vhigh', maxWin:16000, rtp:96.50 },
    { id:'nlc_tombstone', provider:'Nolimit City', name:'Tombstone', vol:'vhigh', maxWin:12000, rtp:96.50 },
    { id:'nlc_tomb_of_nefertiti', provider:'Nolimit City', name:'Tomb of Nefertiti', vol:'vhigh', maxWin:9000, rtp:96.50 },
    { id:'nlc_starstruck', provider:'Nolimit City', name:'Starstruck', vol:'vhigh', maxWin:8000, rtp:96.50 },
    { id:'nlc_the_border', provider:'Nolimit City', name:'The Border', vol:'vhigh', maxWin:6400, rtp:96.50 },
    { id:'nlc_warrior_graveyard_xnudge', provider:'Nolimit City', name:'Warrior Graveyard xNudge', vol:'vhigh', maxWin:5016, rtp:96.50 },
    { id:'nlc_manhattan_goes_wild', provider:'Nolimit City', name:'Manhattan Goes Wild', vol:'vhigh', maxWin:4744, rtp:96.50 },
    { id:'nlc_warrior_graveyard', provider:'Nolimit City', name:'Warrior Graveyard', vol:'vhigh', maxWin:3055, rtp:96.50 },
    { id:'nlc_ice_ice_yeti', provider:'Nolimit City', name:'Ice Ice Yeti', vol:'vhigh', maxWin:2435, rtp:96.50 },
    { id:'nlc_gaelic_gold', provider:'Nolimit City', name:'Gaelic Gold', vol:'vhigh', maxWin:2222, rtp:96.50 },
    { id:'nlc_gaelic_gold_xnudge', provider:'Nolimit City', name:'Gaelic Gold xNudge', vol:'vhigh', maxWin:2222, rtp:96.50 },
    { id:'nlc_blood_diamond', provider:'Nolimit City', name:'Blood Diamond', vol:'vhigh', maxWin:1718, rtp:96.50 },
    { id:'nlc_harlequin_carnival', provider:'Nolimit City', name:'Harlequin Carnival', vol:'vhigh', maxWin:1524, rtp:96.50 },
    { id:'nlc_milky_ways', provider:'Nolimit City', name:'Milky Ways', vol:'vhigh', maxWin:1500, rtp:96.50 },
    { id:'nlc_xways_hoarder_2', provider:'Nolimit City', name:'xWays Hoarder 2', vol:'vhigh', maxWin:1500, rtp:96.50 },
    { id:'nlc_xways_hoarder_split', provider:'Nolimit City', name:'xWays Hoarder Split', vol:'vhigh', maxWin:1500, rtp:96.50 },
    { id:'nlc_evil_goblins_xbomb', provider:'Nolimit City', name:'Evil Goblins xBomb', vol:'vhigh', maxWin:1440, rtp:96.50 },
    { id:'nlc_bonus_bunnies', provider:'Nolimit City', name:'Bonus Bunnies', vol:'vhigh', maxWin:1250, rtp:96.50 },
    { id:'nlc_blood_and_shadow', provider:'Nolimit City', name:'Blood & Shadow', vol:'vhigh', maxWin:1050, rtp:96.50 },
    { id:'nlc_san_quentin_2_death_row', provider:'Nolimit City', name:'San Quentin 2: Death Row', vol:'vhigh', maxWin:1000, rtp:96.50 },
    { id:'nlc_d_day', provider:'Nolimit City', name:'D-Day', vol:'vhigh', maxWin:1000, rtp:96.50 },
    { id:'nlc_disorder', provider:'Nolimit City', name:'Disorder', vol:'vhigh', maxWin:1000, rtp:96.50 },
    { id:'nlc_gator_hunters', provider:'Nolimit City', name:'Gator Hunters', vol:'vhigh', maxWin:1000, rtp:96.50 },
    { id:'nlc_ugliest_catch', provider:'Nolimit City', name:'Ugliest Catch', vol:'vhigh', maxWin:1000, rtp:96.50 },
    { id:'nlc_punk_rocker_xways', provider:'Nolimit City', name:'Punk Rocker xWays', vol:'vhigh', maxWin:950, rtp:96.50 },
    { id:'nlc_true_grit_redemption', provider:'Nolimit City', name:'True Grit Redemption', vol:'vhigh', maxWin:900, rtp:96.50 },
    { id:'nlc_bangkok_hilton', provider:'Nolimit City', name:'Bangkok Hilton', vol:'vhigh', maxWin:840, rtp:96.50 },
    { id:'nlc_jingle_balls', provider:'Nolimit City', name:'Jingle Balls', vol:'vhigh', maxWin:800, rtp:96.50 },
    { id:'nlc_disturbed', provider:'Nolimit City', name:'Disturbed', vol:'vhigh', maxWin:750, rtp:96.50 },
    { id:'nlc_kiss_my_chainsaw', provider:'Nolimit City', name:'Kiss My Chainsaw', vol:'vhigh', maxWin:697, rtp:96.50 },
    { id:'nlc_crazy_ex_girlfriend', provider:'Nolimit City', name:'Crazy Ex-Girlfriend', vol:'vhigh', maxWin:666, rtp:96.50 },
    { id:'nlc_blood_and_shadow_2', provider:'Nolimit City', name:'Blood & Shadow 2', vol:'vhigh', maxWin:600, rtp:96.50 },
    { id:'nlc_misery_mining', provider:'Nolimit City', name:'Misery Mining', vol:'vhigh', maxWin:600, rtp:96.50 },
    { id:'nlc_tomb_of_akhenaten', provider:'Nolimit City', name:'Tomb of Akhenaten', vol:'vhigh', maxWin:600, rtp:96.50 },
    { id:'nlc_dead', provider:'Nolimit City', name:'Dead', vol:'vhigh', maxWin:555, rtp:96.50 },
    { id:'nlc_dead_dead_or_deader', provider:'Nolimit City', name:'Dead, Dead Or Deader', vol:'vhigh', maxWin:500, rtp:96.50 },
    { id:'nlc_deadwood_r_i_p', provider:'Nolimit City', name:'Deadwood R.I.P', vol:'vhigh', maxWin:420, rtp:96.50 },
    { id:'nlc_gluttony', provider:'Nolimit City', name:'Gluttony', vol:'vhigh', maxWin:400, rtp:96.50 },
    { id:'nlc_fire_in_the_hole_2', provider:'Nolimit City', name:'Fire in the Hole 2', vol:'vhigh', maxWin:350, rtp:96.50 },
    { id:'nlc_mental', provider:'Nolimit City', name:'Mental', vol:'vhigh', maxWin:333, rtp:96.50 },
    { id:'nlc_brute_force', provider:'Nolimit City', name:'Brute Force', vol:'vhigh', maxWin:240, rtp:96.50 }
  ];

  function normTag(s){
    const t = String(s||'').trim().toLowerCase();
    if(!t) return '';
    return t
      .replace(/\s+/g,'-')
      .replace(/[^a-z0-9\-_.]/g,'')
      .slice(0, 32);
  }

  function uniq(arr){
    const out = [];
    const seen = new Set();
    for(const v of arr){
      const s = String(v||'');
      if(!s) continue;
      if(seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }

  function makeId(provider, name){
    const p = String(provider||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,18) || 'slot';
    const n = String(name||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,28) || 'game';
    return `${p}_${n}`;
  }

  function sanitizeItem(it){
    if(!it || typeof it !== 'object') return null;
    const name = String(it.name||'').trim();
    if(!name) return null;
    const provider = String(it.provider||'').trim() || 'Pragmatic';
    let id = String(it.id||'').trim();
    if(!id) id = makeId(provider, name);

    const vol = ['low','mid','high','vhigh','unknown'].includes(it.vol) ? it.vol : 'unknown';
    const maxWin = Number.isFinite(Number(it.maxWin)) ? Number(it.maxWin) : null;
    const rtp = Number.isFinite(Number(it.rtp)) ? Number(it.rtp) : null;

    const rawTags = Array.isArray(it.tags) ? it.tags : (typeof it.tags==='string' ? it.tags.split(',') : []);
    const tags = uniq(rawTags.map(normTag).filter(Boolean)).slice(0, 10);

    return { id, provider, name, vol, maxWin, rtp, tags };
  }

  function loadDb(){
    const stored = lsRead(DB_KEY, null);
    if(Array.isArray(stored) && stored.length){
      const clean = stored.map(sanitizeItem).filter(Boolean);
      return clean.length ? ensureUniqueIds(clean) : ensureUniqueIds(DEFAULT_DB.map(sanitizeItem).filter(Boolean));
    }
    return ensureUniqueIds(DEFAULT_DB.map(sanitizeItem).filter(Boolean));
  }

  function saveDb(db){
    lsWrite(DB_KEY, db);
  }

  function loadFav(){
    const v = lsRead(FAV_KEY, []);
    const set = new Set(Array.isArray(v) ? v.map(String) : []);
    return set;
  }

  function saveFav(set){
    lsWrite(FAV_KEY, Array.from(set));
  }

  function ensureUniqueIds(list){
    const used = new Set();
    return list.map(it=>{
      let id = String(it.id||'').trim();
      if(!id) id = makeId(it.provider, it.name);
      let cur = id;
      let i = 2;
      while(used.has(cur)){
        cur = `${id}_${i++}`;
      }
      used.add(cur);
      it.id = cur;
      return it;
    });
  }

  let DB = null;
  let FAV = null;

  function toast(msg){
    const el = $('slDbToast');
    if(!el) return;
    el.textContent = msg || '';
    if(msg){
      clearTimeout(toast._t);
      toast._t = setTimeout(()=>{ el.textContent=''; }, 2600);
    }
  }

  function setActiveTab(tab){
    const tabs = Array.from(document.querySelectorAll('#slTabs .sl-tab'));
    const panels = Array.from(document.querySelectorAll('.sl-panel'));
    tabs.forEach(btn=>{
      const on = btn.getAttribute('data-tab') === tab;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(p=>{
      const on = p.getAttribute('data-panel') === tab;
      p.classList.toggle('on', on);
    });
    lsWrite(TAB_KEY, tab);
  }

  function initTabs(){
    const root = $('slTabs');
    if(!root) return;

    root.addEventListener('click', (e)=>{
      const btn = e.target && e.target.closest('button[data-tab]');
      if(!btn) return;
      setActiveTab(btn.getAttribute('data-tab'));
    });

    const saved = lsRead(TAB_KEY, 'calc');
    setActiveTab(['calc','db','session'].includes(saved) ? saved : 'calc');
  }

  function maxwinBucket(v){
    if(!Number.isFinite(v)) return 'unknown';
    return v>=5000 ? 'gte5000' : 'lt5000';
  }

  function buildTagOptions(){
    const sel = $('slDbTag');
    if(!sel) return;
    const prev = sel.value || '';
    const tags = uniq((DB||[]).flatMap(it=>Array.isArray(it.tags)?it.tags:[])).sort();
    sel.innerHTML = ['<option value="">전체</option>', ...tags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`)].join('');
    if(tags.includes(prev)) sel.value = prev;
  }

  function renderDb(){
    const body = $('slDbBody');
    if(!body) return;

    if(!DB) DB = loadDb();
    if(!FAV) FAV = loadFav();

    const q = String(($('slDbQ') && $('slDbQ').value) || '').trim().toLowerCase();
    const vol = ($('slDbVol') && $('slDbVol').value) || '';
    const mx = ($('slDbMaxwin') && $('slDbMaxwin').value) || '';
    const tag = ($('slDbTag') && $('slDbTag').value) || '';
    const favOnly = !!($('slDbFavOnly') && $('slDbFavOnly').checked);

    let list = DB.slice();
    if(q){
      list = list.filter(it=>String(it.name||'').toLowerCase().includes(q));
    }
    if(vol){
      list = list.filter(it=>(it.vol||'unknown')===vol);
    }
    if(mx){
      list = list.filter(it=>maxwinBucket(Number(it.maxWin))===mx);
    }
    if(tag){
      list = list.filter(it=>Array.isArray(it.tags) && it.tags.includes(tag));
    }
    if(favOnly){
      list = list.filter(it=>FAV.has(it.id));
    }

    // sort: favorites first, then name
    list.sort((a,b)=>{
      const fa = FAV.has(a.id) ? 1 : 0;
      const fb = FAV.has(b.id) ? 1 : 0;
      if(fa!==fb) return fb-fa;
      return String(a.name||'').localeCompare(String(b.name||''));
    });

    if(!list.length){
      body.innerHTML = '<tr><td colspan="4" class="sl-muted">조건에 맞는 게임이 없습니다.</td></tr>';
      return;
    }

    body.innerHTML = list.map(it=>{
      const volLabel = VOL_LABEL[it.vol||'unknown'] || '미표기';
      const maxWin = Number.isFinite(Number(it.maxWin)) ? fmtX(Number(it.maxWin)) : '—';
      const fav = FAV.has(it.id);
      const tags = Array.isArray(it.tags) ? it.tags.slice(0, 6) : [];
      return `
        <tr>
          <td data-label="게임">
            <div class="sl-gamecell">
              <div class="sl-gamehead">
                <button class="sl-star ${fav?'on':''}" type="button" data-fav="${esc(it.id)}" aria-label="즐겨찾기">${fav?'★':'☆'}</button>
                <div>${esc(it.name)} <span class="sl-muted" style="margin-left:6px; font-weight:900;">(${esc(it.provider||'')})</span></div>
              </div>
              ${tags.length ? `<div class="sl-tags">${tags.map(t=>`<span class=\"sl-tag\">${esc(t)}</span>`).join('')}</div>` : ''}
            </div>
          </td>
          <td data-label="변동성">${volLabel==='미표기'?'<span class="sl-missing">미표기</span>':esc(volLabel)}</td>
          <td data-label="Max Win">${maxWin==='—'?'<span class="sl-missing">미표기</span>':esc(maxWin)}</td>
          <td data-label="액션">
            <div class="sl-actions">
              <button class="sl-mini" type="button" data-load="${esc(it.id)}">RTP로</button>
              <button class="sl-mini" type="button" data-session="${esc(it.id)}">세션</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function wireDb(){
    if(!DB) DB = loadDb();
    if(!FAV) FAV = loadFav();
    buildTagOptions();

    const q = $('slDbQ');
    const vol = $('slDbVol');
    const mx = $('slDbMaxwin');
    const tag = $('slDbTag');
    const favOnly = $('slDbFavOnly');
    [q,vol,mx,tag,favOnly].forEach(el=>{
      if(!el) return;
      el.addEventListener('input', ()=>renderDb());
      el.addEventListener('change', ()=>renderDb());
    });


    // v62: premium favorites toggle button
    const favBtn = $('slDbFavBtn');
    const favText = $('slDbFavText');
    function syncFavToggle(){
      if(!favOnly || !favBtn) return;
      const on = !!favOnly.checked;
      favBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if(favText) favText.textContent = on ? '즐겨찾기만 보기' : '전체 보기';
    }
    if(favBtn && favOnly){
      favBtn.addEventListener('click', ()=>{
        favOnly.checked = !favOnly.checked;
        syncFavToggle();
        renderDb();
      });
      favOnly.addEventListener('change', syncFavToggle);
      syncFavToggle();
    }

    const body = $('slDbBody');
    if(body){
      body.addEventListener('click', (e)=>{
        const favBtn = e.target && e.target.closest('button[data-fav]');
        const loadBtn = e.target && e.target.closest('button[data-load]');
        const sessBtn = e.target && e.target.closest('button[data-session]');
        if(!favBtn && !loadBtn && !sessBtn) return;

        if(favBtn){
          const id = favBtn.getAttribute('data-fav');
          if(!id) return;
          if(FAV.has(id)) FAV.delete(id);
          else FAV.add(id);
          saveFav(FAV);
          renderDb();
          return;
        }

        const id = (loadBtn||sessBtn).getAttribute(loadBtn?'data-load':'data-session');
        const it = DB.find(x=>x.id===id);
        if(!it) return;

        if(loadBtn){
          const nameEl = $('slotName');
          const volEl = $('vol');
          if(nameEl) nameEl.value = it.name;
          if(volEl && it.vol && ['low','mid','high','vhigh'].includes(it.vol)) volEl.value = it.vol;
          // If rtp is known later, we can prefill it.
          if(Number.isFinite(it.rtp) && $('rtp')) $('rtp').value = String(it.rtp);
          setActiveTab('calc');
          if($('rtp')) $('rtp').focus();
        }

        if(sessBtn){
          if($('slSessGame')) $('slSessGame').value = it.name;
          setActiveTab('session');
          if($('slSessBet')) $('slSessBet').focus();
        }
      });
    }

    // ---- DB management ----
    const addBtn = $('slDbAddBtn');
    const exportBtn = $('slDbExportBtn');
    const importFile = $('slDbImportFile');
    const importTextBtn = $('slDbImportTextBtn');
    const resetBtn = $('slDbResetBtn');

    function readAddForm(){
      const name = String(($('slAddName') && $('slAddName').value) || '').trim();
      const provider = String(($('slAddProvider') && $('slAddProvider').value) || '').trim() || 'Pragmatic';
      const vol = (($('slAddVol') && $('slAddVol').value) || 'unknown');
      const maxWin = num(($('slAddMaxwin') && $('slAddMaxwin').value));
      const rtp = num(($('slAddRtp') && $('slAddRtp').value));
      const tags = String(($('slAddTags') && $('slAddTags').value) || '').split(',').map(normTag).filter(Boolean);
      return {
        name,
        provider,
        vol: ['low','mid','high','vhigh','unknown'].includes(vol) ? vol : 'unknown',
        maxWin: Number.isFinite(maxWin) ? maxWin : null,
        rtp: Number.isFinite(rtp) ? rtp : null,
        tags
      };
    }

    function addGame(){
      const it = readAddForm();
      if(!it.name){ toast('게임명을 입력해 주세요.'); return; }
      const baseId = makeId(it.provider, it.name);
      const item = sanitizeItem({ ...it, id: baseId });
      if(!item){ toast('입력값을 확인해 주세요.'); return; }

      // merge by (name+provider) first
      const key = (x)=>`${String(x.provider||'').toLowerCase()}|${String(x.name||'').toLowerCase()}`;
      const k = key(item);
      let replaced = false;
      DB = DB.map(x=>{
        if(key(x)===k){ replaced = true; return { ...x, ...item, id: x.id }; }
        return x;
      });
      if(!replaced){
        DB.unshift(item);
        DB = ensureUniqueIds(DB);
      }
      saveDb(DB);
      buildTagOptions();
      renderDb();
      toast(replaced ? '기존 게임 정보를 업데이트했어요.' : '게임을 DB에 추가했어요.');

      // clear lightweight
      if($('slAddName')) $('slAddName').value = '';
      if($('slAddMaxwin')) $('slAddMaxwin').value = '';
      if($('slAddRtp')) $('slAddRtp').value = '';
      if($('slAddTags')) $('slAddTags').value = '';
    }

    function exportDb(){
      const blob = new Blob([JSON.stringify(DB||[], null, 2)], {type:'application/json;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '88st_slot_db.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('JSON로 내보냈어요.');
    }

    function importDbFromText(text, overwrite){
      const parsed = safeJsonParse(text, null);
      if(!Array.isArray(parsed)){
        toast('JSON 형식을 확인해 주세요. (배열 형태)');
        return;
      }
      const incoming = parsed.map(sanitizeItem).filter(Boolean).slice(0, 2000);
      if(!incoming.length){ toast('가져올 항목이 없어요.'); return; }

      if(overwrite){
        DB = ensureUniqueIds(incoming);
        saveDb(DB);
        // favorites that no longer exist are pruned
        const ids = new Set(DB.map(x=>x.id));
        FAV = new Set(Array.from(FAV||[]).filter(id=>ids.has(id)));
        saveFav(FAV);
        buildTagOptions();
        renderDb();
        toast(`DB를 ${incoming.length}개 항목으로 덮어썼어요.`);
        return;
      }

      // merge
      const byId = new Map((DB||[]).map(x=>[x.id, x]));
      const byKey = new Map((DB||[]).map(x=>[`${String(x.provider||'').toLowerCase()}|${String(x.name||'').toLowerCase()}`, x]));
      let added = 0, updated = 0;

      for(const it of incoming){
        if(byId.has(it.id)){
          const cur = byId.get(it.id);
          Object.assign(cur, it);
          updated++;
          continue;
        }
        const k = `${String(it.provider||'').toLowerCase()}|${String(it.name||'').toLowerCase()}`;
        if(byKey.has(k)){
          const cur = byKey.get(k);
          Object.assign(cur, it, { id: cur.id });
          updated++;
          continue;
        }
        DB.push(it);
        byId.set(it.id, it);
        byKey.set(k, it);
        added++;
      }

      DB = ensureUniqueIds(DB);
      saveDb(DB);
      buildTagOptions();
      renderDb();
      toast(`가져오기 완료: 추가 ${added} / 업데이트 ${updated}`);
    }

    if(addBtn) addBtn.addEventListener('click', addGame);
    if(exportBtn) exportBtn.addEventListener('click', exportDb);

    if(importFile){
      importFile.addEventListener('change', ()=>{
        const f = importFile.files && importFile.files[0];
        if(!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{
          const overwrite = !!($('slDbImportOverwrite') && $('slDbImportOverwrite').checked);
          importDbFromText(String(reader.result||''), overwrite);
        };
        reader.onerror = ()=>toast('파일을 읽지 못했어요.');
        reader.readAsText(f);
        importFile.value = '';
      });
    }

    if(importTextBtn){
      importTextBtn.addEventListener('click', ()=>{
        const text = String(($('slDbImportText') && $('slDbImportText').value) || '').trim();
        if(!text){ toast('붙여넣을 JSON이 비어있어요.'); return; }
        const overwrite = !!($('slDbImportOverwrite') && $('slDbImportOverwrite').checked);
        importDbFromText(text, overwrite);
      });
    }

    if(resetBtn){
      resetBtn.addEventListener('click', ()=>{
        if(!confirm('DB를 기본값으로 되돌리고, 즐겨찾기도 초기화할까요?')) return;
        DB = ensureUniqueIds(DEFAULT_DB.map(sanitizeItem).filter(Boolean));
        FAV = new Set();
        saveDb(DB);
        saveFav(FAV);
        buildTagOptions();
        renderDb();
        toast('기본 DB로 초기화했어요.');
      });
    }

    renderDb();
  }

  // ---- Session tracker ----
  function loadSessions(){
    const v = lsRead(SESS_KEY, []);
    return Array.isArray(v) ? v : [];
  }
  function saveSessions(list){
    lsWrite(SESS_KEY, list);
  }

  function setBad(el, bad){
    if(!el) return;
    el.classList.toggle('sl-bad', !!bad);
  }

  function dateLabel(ts){
    try{
      const d = new Date(ts);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      return `${yyyy}-${mm}-${dd}`;
    }catch(_){ return '—'; }
  }

  function renderSessions(){
    const body = $('slSessBody');
    if(!body) return;

    const list = loadSessions();
    if(!list.length){
      body.innerHTML = '<tr><td colspan="6" class="sl-muted">아직 기록이 없습니다.</td></tr>';
      $('slSessKpiCount').textContent = '0';
      $('slSessKpiBet').textContent = '-';
      $('slSessKpiPL').textContent = '-';
      $('slSessKpiRoi').textContent = '-';
      return;
    }

    const totalBet = list.reduce((a,b)=>a+(Number(b.totalBet)||0),0);
    const totalRet = list.reduce((a,b)=>a+(Number(b.ret)||0),0);
    const totalPL = totalRet - totalBet;
    const roi = totalBet>0 ? (totalPL/totalBet)*100 : NaN;

    $('slSessKpiCount').textContent = String(list.length);
    $('slSessKpiBet').textContent = fmtWon(totalBet);
    $('slSessKpiPL').textContent = fmtWon(totalPL);
    $('slSessKpiPL').classList.toggle('neg', totalPL<0);
    $('slSessKpiRoi').textContent = Number.isFinite(roi) ? roi.toFixed(2)+'%' : '-';

    body.innerHTML = list.slice(0, 120).map(it=>{
      const pl = Number(it.pl)||0;
      return `
        <tr>
          <td data-label="날짜">${esc(dateLabel(it.ts))}</td>
          <td data-label="게임">${esc(it.game||'')}</td>
          <td data-label="총 베팅">${esc(fmtWon(Number(it.totalBet)||0))}</td>
          <td data-label="회수">${esc(fmtWon(Number(it.ret)||0))}</td>
          <td data-label="손익"><span style="${pl<0?'color:rgba(255,120,120,.92);':''}">${esc(fmtWon(pl))}</span></td>
          <td data-label="삭제"><button class="sl-mini" type="button" data-del="${esc(it.id)}">삭제</button></td>
        </tr>
      `;
    }).join('');

    body.querySelectorAll('button[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-del');
        const next = loadSessions().filter(x=>x && x.id !== id);
        saveSessions(next);
        renderSessions();
      });
    });
  }

  function addSession(){
    const gameEl = $('slSessGame');
    const betEl = $('slSessBet');
    const spinsEl = $('slSessSpins');
    const retEl = $('slSessReturn');

    const game = String(gameEl && gameEl.value || '').trim();
    const bet = num(betEl && betEl.value);
    const spins = num(spinsEl && spinsEl.value);
    const ret = num(retEl && retEl.value);

    const badGame = !game;
    const badBet = !(Number.isFinite(bet) && bet>0);
    const badSpins = !(Number.isFinite(spins) && spins>0);
    const badRet = !(Number.isFinite(ret) && ret>=0);

    setBad(gameEl, badGame);
    setBad(betEl, badBet);
    setBad(spinsEl, badSpins);
    setBad(retEl, badRet);

    if(badGame || badBet || badSpins || badRet){
      return;
    }

    const totalBet = bet * spins;
    const pl = ret - totalBet;

    const entry = {
      id: 'sl_' + Math.random().toString(36).slice(2,10) + '_' + Date.now(),
      ts: Date.now(),
      game,
      bet: Math.floor(bet),
      spins: Math.floor(spins),
      ret: Math.floor(ret),
      totalBet: Math.floor(totalBet),
      pl: Math.floor(pl)
    };

    const list = loadSessions();
    list.unshift(entry);
    saveSessions(list.slice(0, 500));

    // Clear only numeric fields for quick re-entry
    if(betEl) betEl.value = '';
    if(spinsEl) spinsEl.value = '';
    if(retEl) retEl.value = '';

    renderSessions();
  }

  function copyText(text){
    if(!text) return;
    const doFallback = ()=>{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try{ document.execCommand('copy'); }catch(_){ /* ignore */ }
      document.body.removeChild(ta);
    };

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).catch(()=>doFallback());
    }else doFallback();
  }

  function buildSummary(){
    const list = loadSessions();
    const totalBet = list.reduce((a,b)=>a+(Number(b.totalBet)||0),0);
    const totalRet = list.reduce((a,b)=>a+(Number(b.ret)||0),0);
    const totalPL = totalRet - totalBet;
    const roi = totalBet>0 ? (totalPL/totalBet)*100 : NaN;

    const lines = [];
    lines.push('[88ST 슬롯 세션 요약]');
    lines.push(`세션: ${list.length}개`);
    lines.push(`총 베팅: ${fmtWon(totalBet)}`);
    lines.push(`총 회수: ${fmtWon(totalRet)}`);
    lines.push(`총 손익: ${fmtWon(totalPL)} (${Number.isFinite(roi)?roi.toFixed(2)+'%':'-'})`);
    lines.push('');

    list.slice(0, 8).forEach((it, idx)=>{
      lines.push(`${idx+1}. ${dateLabel(it.ts)} | ${it.game} | 베팅 ${fmtWon(it.totalBet)} | 회수 ${fmtWon(it.ret)} | 손익 ${fmtWon(it.pl)}`);
    });

    return lines.join('\n');
  }

  function exportCsv(){
    const list = loadSessions();
    const header = ['date','game','bet_per_spin','spins','total_bet','return','pl'];
    const rows = list.map(it=>[
      dateLabel(it.ts),
      String(it.game||'').replace(/\n/g,' '),
      String(it.bet||0),
      String(it.spins||0),
      String(it.totalBet||0),
      String(it.ret||0),
      String(it.pl||0),
    ]);

    const csv = [header.join(','), ...rows.map(r=>r.map(v=>{
      const s = String(v ?? '');
      return /[\",\n]/.test(s) ? '"'+s.replace(/\"/g,'""')+'"' : s;
    }).join(','))].join('\n');

    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '88st_slot_sessions.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function wireSessions(){
    const addBtn = $('slSessAdd');
    const copyBtn = $('slSessCopy');
    const csvBtn = $('slSessCsv');
    const clearBtn = $('slSessClear');

    if(addBtn) addBtn.addEventListener('click', addSession);
    if(copyBtn) copyBtn.addEventListener('click', ()=>copyText(buildSummary()));
    if(csvBtn) csvBtn.addEventListener('click', exportCsv);
    if(clearBtn) clearBtn.addEventListener('click', ()=>{
      if(confirm('세션 기록을 모두 삭제할까요?')){
        saveSessions([]);
        renderSessions();
      }
    });

    // live validation
    ['slSessGame','slSessBet','slSessSpins','slSessReturn'].forEach(id=>{
      const el = $(id);
      if(!el) return;
      el.addEventListener('input', ()=>setBad(el, false));
      el.addEventListener('change', ()=>setBad(el, false));
    });

    renderSessions();
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initTabs();
    wireDb();
    wireSessions();
  });

})();
