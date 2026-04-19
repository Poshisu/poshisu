-- Seed: a starter set of IFCT-style entries for common Indian foods.
-- This is NOT exhaustive. The full IFCT 2017 has ~500+ items.
-- For production, ingest the full IFCT dataset via a one-off ETL script.

-- Cereals & grains
insert into public.ifct_foods (code, name, aliases, category, region, per_100g, typical_serving_g, notes) values
  ('A001', 'Rice, white, raw',           array['chawal','rice raw','basmati raw'],            'cereal', 'pan-india', '{"kcal":345,"protein":6.8,"carbs":78.2,"fat":0.5,"fiber":0.2,"sodium":5}'::jsonb, 50, 'Multiply by ~3 for cooked weight.'),
  ('A002', 'Rice, white, cooked',        array['chawal cooked','plain rice'],                  'cereal', 'pan-india', '{"kcal":130,"protein":2.7,"carbs":28.0,"fat":0.3,"fiber":0.4,"sodium":1}'::jsonb, 150, 'One cup cooked ~150g.'),
  ('A003', 'Roti, wheat',                array['chapati','phulka','wheat roti'],               'cereal', 'pan-india', '{"kcal":264,"protein":8.0,"carbs":50.0,"fat":3.7,"fiber":6.0,"sodium":2}'::jsonb, 40, '1 medium roti ~30-40g.'),
  ('A004', 'Paratha, plain',             array['plain paratha'],                               'cereal', 'north',     '{"kcal":297,"protein":7.5,"carbs":42.0,"fat":11.2,"fiber":4.8,"sodium":4}'::jsonb, 60, 'Made with ghee/oil, calorie-dense.'),
  ('A005', 'Idli',                       array['steamed idli','rice idli'],                    'cereal', 'south',     '{"kcal":135,"protein":4.0,"carbs":28.0,"fat":0.5,"fiber":0.8,"sodium":120}'::jsonb, 50, 'Per piece ~50g.'),
  ('A006', 'Dosa, plain',                array['sada dosa','plain dosa'],                      'cereal', 'south',     '{"kcal":168,"protein":4.5,"carbs":29.0,"fat":3.7,"fiber":1.2,"sodium":110}'::jsonb, 80, 'Add ~50 kcal for masala dosa filling.'),
  ('A007', 'Poha',                       array['flattened rice','aval','chivda'],              'cereal', 'west',      '{"kcal":190,"protein":3.5,"carbs":38.0,"fat":3.0,"fiber":1.5,"sodium":150}'::jsonb, 100, 'Cooked with onion, mustard, oil.'),
  ('A008', 'Upma',                       array['rava upma','suji upma'],                       'cereal', 'south',     '{"kcal":175,"protein":4.0,"carbs":28.0,"fat":5.0,"fiber":1.5,"sodium":200}'::jsonb, 120, 'Made with semolina, oil, vegetables.'),
  ('A009', 'Puri',                       array['poori','deep fried bread'],                    'cereal', 'pan-india', '{"kcal":355,"protein":7.5,"carbs":45.0,"fat":16.5,"fiber":2.5,"sodium":3}'::jsonb, 25, 'Per piece ~25g, deep fried in oil.'),
  ('A010', 'Naan, plain',                array['butter naan' /* note butter adds kcal */],     'cereal', 'north',     '{"kcal":290,"protein":9.0,"carbs":50.0,"fat":5.5,"fiber":2.0,"sodium":380}'::jsonb, 90, 'Restaurant naan often brushed with ghee.'),

-- Pulses & legumes
  ('B001', 'Toor dal, cooked',           array['arhar dal','tur dal','plain dal'],             'pulse',  'pan-india', '{"kcal":116,"protein":7.0,"carbs":20.0,"fat":0.8,"fiber":4.5,"sodium":250}'::jsonb, 150, 'One katori ~150ml. Tarka adds 50 kcal.'),
  ('B002', 'Moong dal, cooked',          array['yellow moong','green dal'],                    'pulse',  'pan-india', '{"kcal":105,"protein":7.5,"carbs":18.0,"fat":0.5,"fiber":3.0,"sodium":230}'::jsonb, 150, NULL),
  ('B003', 'Rajma, cooked',              array['kidney beans','rajma curry'],                  'pulse',  'north',     '{"kcal":140,"protein":8.5,"carbs":23.0,"fat:":1.5,"fiber":7.0,"sodium":300}'::jsonb, 200, 'Curry version is heavier — assume +30%.'),
  ('B004', 'Chana, chickpeas, cooked',   array['kabuli chana','chole','chickpeas'],            'pulse',  'pan-india', '{"kcal":164,"protein":9.0,"carbs":27.0,"fat":2.5,"fiber":7.5,"sodium":280}'::jsonb, 150, 'Chole curry adds oil/spices.'),
  ('B005', 'Black chana',                array['kala chana','bengal gram'],                    'pulse',  'pan-india', '{"kcal":160,"protein":9.5,"carbs":25.0,"fat":2.0,"fiber":8.0,"sodium":15}'::jsonb, 100, NULL),
  ('B006', 'Sambar',                     array['toor dal sambar','south indian dal'],          'pulse',  'south',     '{"kcal":85,"protein":4.5,"carbs":12.0,"fat":2.5,"fiber":3.0,"sodium":350}'::jsonb, 200, 'With vegetables and tamarind.'),

-- Vegetables
  ('C001', 'Aloo gobi',                  array['potato cauliflower'],                          'vegetable', 'north',  '{"kcal":110,"protein":3.0,"carbs":15.0,"fat":4.5,"fiber":3.5,"sodium":280}'::jsonb, 150, 'Moderate oil home cooking.'),
  ('C002', 'Bhindi sabzi',               array['okra fry','ladies finger'],                    'vegetable', 'pan-india','{"kcal":120,"protein":3.5,"carbs":12.0,"fat":7.0,"fiber":4.5,"sodium":260}'::jsonb, 120, 'Often pan-fried, oil-heavy.'),
  ('C003', 'Palak paneer',               array['saag paneer','spinach cheese'],                'vegetable', 'north',  '{"kcal":180,"protein":11.0,"carbs":7.0,"fat":13.0,"fiber":3.5,"sodium":350}'::jsonb, 200, 'Cream and ghee push calories up.'),
  ('C004', 'Mixed vegetable curry',      array['mix veg','navratan'],                          'vegetable', 'pan-india','{"kcal":130,"protein":4.5,"carbs":15.0,"fat":6.5,"fiber":4.0,"sodium":300}'::jsonb, 180, NULL),

-- Dairy & paneer
  ('D001', 'Paneer',                     array['cottage cheese','cheese cubes'],               'dairy', 'pan-india',   '{"kcal":265,"protein":18.3,"carbs":1.2,"fat":20.8,"fiber":0,"sodium":18}'::jsonb, 50, 'Per piece ~25g.'),
  ('D002', 'Curd, plain',                array['dahi','yogurt','plain curd'],                  'dairy', 'pan-india',   '{"kcal":60,"protein":3.1,"carbs":4.7,"fat":3.3,"fiber":0,"sodium":42}'::jsonb, 100, 'Whole milk curd.'),
  ('D003', 'Buttermilk',                 array['chaas','majjige','salted buttermilk'],         'dairy', 'pan-india',   '{"kcal":40,"protein":2.0,"carbs":4.5,"fat":1.5,"fiber":0,"sodium":150}'::jsonb, 200, 'One glass ~200ml.'),
  ('D004', 'Milk, full fat',             array['whole milk','dudh'],                           'dairy', 'pan-india',   '{"kcal":67,"protein":3.3,"carbs":4.8,"fat":4.1,"fiber":0,"sodium":50}'::jsonb, 200, NULL),
  ('D005', 'Chai, with sugar',           array['masala chai','indian tea','tea with sugar'],   'beverage', 'pan-india','{"kcal":75,"protein":1.5,"carbs":11.0,"fat":2.5,"fiber":0,"sodium":15}'::jsonb, 150, 'One cup with milk and ~1 tsp sugar.'),

-- Common snacks
  ('E001', 'Samosa',                     array['veg samosa','aloo samosa'],                    'snack', 'pan-india',  '{"kcal":260,"protein":5.0,"carbs":24.0,"fat":17.0,"fiber":2.5,"sodium":420}'::jsonb, 60, 'Per piece ~50-70g, deep fried.'),
  ('E002', 'Pakora',                     array['bhajiya','onion pakora'],                      'snack', 'pan-india',  '{"kcal":315,"protein":7.5,"carbs":27.0,"fat":20.0,"fiber":3.0,"sodium":380}'::jsonb, 80, 'Deep fried gram flour.'),
  ('E003', 'Vada, medu',                 array['medu vada','urad vada'],                       'snack', 'south',      '{"kcal":290,"protein":7.0,"carbs":28.0,"fat":17.0,"fiber":3.5,"sodium":300}'::jsonb, 50, 'Per piece ~50g.'),
  ('E004', 'Papad, roasted',             array['papadum','appalam'],                           'snack', 'pan-india',  '{"kcal":370,"protein":18.0,"carbs":50.0,"fat":1.5,"fiber":2.5,"sodium":1500}'::jsonb, 12, 'Per piece ~12g. Fried doubles the kcal.'),

-- Fruits
  ('F001', 'Banana',                     array['kela'],                                        'fruit', 'pan-india',   '{"kcal":89,"protein":1.1,"carbs":23.0,"fat":0.3,"fiber":2.6,"sodium":1}'::jsonb, 120, 'Per medium banana ~120g.'),
  ('F002', 'Apple',                      array['seb'],                                         'fruit', 'pan-india',   '{"kcal":52,"protein":0.3,"carbs":14.0,"fat":0.2,"fiber":2.4,"sodium":1}'::jsonb, 180, NULL),
  ('F003', 'Mango',                      array['aam','alphonso','dussehri'],                   'fruit', 'pan-india',   '{"kcal":60,"protein":0.8,"carbs":15.0,"fat":0.4,"fiber":1.6,"sodium":1}'::jsonb, 150, 'Seasonal, high in natural sugar.');
