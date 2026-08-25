export interface WHODiagnosis {
  code: string;
  name: string;
  category: string;
  keywords: string[];
}

export const WHO_DIAGNOSES: WHODiagnosis[] = [
  // Infectious & Parasitic Diseases (A00-B99)
  { code: 'A09', name: 'Infectious gastroenteritis and colitis, unspecified', category: 'Infectious Diseases', keywords: ['diarrhea', 'gastroenteritis', 'stomach flu', 'food poisoning', 'colitis'] },
  { code: 'A01.0', name: 'Typhoid fever', category: 'Infectious Diseases', keywords: ['typhoid', 'salmonella', 'enteric fever'] },
  { code: 'B54', name: 'Unspecified malaria', category: 'Infectious Diseases', keywords: ['malaria', 'plasmodium', 'fever', 'chills'] },
  { code: 'B50.9', name: 'Plasmodium falciparum malaria, unspecified', category: 'Infectious Diseases', keywords: ['falciparum', 'severe malaria', 'tropical malaria'] },
  { code: 'A15.0', name: 'Tuberculosis of lung, confirmed by sputum microscopy', category: 'Infectious Diseases', keywords: ['tb', 'tuberculosis', 'pulmonary tb', 'lung infection'] },
  { code: 'B20', name: 'Human immunodeficiency virus [HIV] disease', category: 'Infectious Diseases', keywords: ['hiv', 'aids', 'retrovirus'] },
  { code: 'B34.9', name: 'Viral infection, unspecified', category: 'Infectious Diseases', keywords: ['viral illness', 'viral fever', 'virus'] },
  { code: 'B37.0', name: 'Candidal stomatitis (Oral thrush)', category: 'Infectious Diseases', keywords: ['thrush', 'candida', 'oral fungal infection'] },
  { code: 'B35.4', name: 'Tinea corporis (Ringworm of body)', category: 'Infectious Diseases', keywords: ['ringworm', 'tinea', 'fungal skin infection'] },
  { code: 'A49.9', name: 'Bacterial infection, unspecified', category: 'Infectious Diseases', keywords: ['bacterial illness', 'bacteria', 'sepsis'] },

  // Respiratory System (J00-J99)
  { code: 'J00', name: 'Acute nasopharyngitis [common cold]', category: 'Respiratory System', keywords: ['cold', 'runny nose', 'coryza', 'nasopharyngitis', 'sneezing'] },
  { code: 'J01.9', name: 'Acute sinusitis, unspecified', category: 'Respiratory System', keywords: ['sinusitis', 'sinus infection', 'rhinosinusitis', 'facial pain'] },
  { code: 'J02.9', name: 'Acute pharyngitis, unspecified (Sore throat)', category: 'Respiratory System', keywords: ['pharyngitis', 'sore throat', 'throat infection'] },
  { code: 'J03.9', name: 'Acute tonsillitis, unspecified', category: 'Respiratory System', keywords: ['tonsillitis', 'swollen tonsils', 'strep throat'] },
  { code: 'J06.9', name: 'Acute upper respiratory infection, unspecified', category: 'Respiratory System', keywords: ['urti', 'uri', 'upper respiratory', 'flu symptoms'] },
  { code: 'J18.9', name: 'Pneumonia, unspecified organism', category: 'Respiratory System', keywords: ['pneumonia', 'chest infection', 'consolidation'] },
  { code: 'J20.9', name: 'Acute bronchitis, unspecified', category: 'Respiratory System', keywords: ['bronchitis', 'chest cold', 'productive cough'] },
  { code: 'J45.909', name: 'Unspecified asthma, uncomplicated', category: 'Respiratory System', keywords: ['asthma', 'wheezing', 'bronchospasm', 'shortness of breath'] },
  { code: 'J44.9', name: 'Chronic obstructive pulmonary disease, unspecified', category: 'Respiratory System', keywords: ['copd', 'emphysema', 'chronic bronchitis'] },
  { code: 'J30.9', name: 'Allergic rhinitis, unspecified (Hay fever)', category: 'Respiratory System', keywords: ['allergic rhinitis', 'hay fever', 'nasal allergy'] },

  // Circulatory System (I00-I99)
  { code: 'I10', name: 'Essential (primary) hypertension', category: 'Circulatory System', keywords: ['hypertension', 'high blood pressure', 'bp', 'htn'] },
  { code: 'I20.9', name: 'Angina pectoris, unspecified', category: 'Circulatory System', keywords: ['angina', 'chest pain', 'ischemic heart'] },
  { code: 'I25.10', name: 'Atherosclerotic heart disease of native coronary artery', category: 'Circulatory System', keywords: ['cad', 'coronary artery disease', 'ischemia'] },
  { code: 'I50.9', name: 'Heart failure, unspecified', category: 'Circulatory System', keywords: ['heart failure', 'chf', 'cardiac failure', 'fluid overload'] },
  { code: 'I63.9', name: 'Cerebral infarction, unspecified (Ischemic stroke)', category: 'Circulatory System', keywords: ['stroke', 'cva', 'cerebrovascular accident', 'brain ischemia'] },
  { code: 'I80.2', name: 'Phlebitis and thrombophlebitis of deep vessels (DVT)', category: 'Circulatory System', keywords: ['dvt', 'deep vein thrombosis', 'blood clot'] },
  { code: 'I84.9', name: 'Hemorrhoids, unspecified', category: 'Circulatory System', keywords: ['hemorrhoids', 'piles', 'rectal bleeding'] },

  // Endocrine, Nutritional & Metabolic (E00-E90)
  { code: 'E11.9', name: 'Type 2 diabetes mellitus without complications', category: 'Endocrine & Metabolic', keywords: ['diabetes', 't2dm', 'type 2 diabetes', 'hyperglycemia', 'high blood sugar'] },
  { code: 'E10.9', name: 'Type 1 diabetes mellitus without complications', category: 'Endocrine & Metabolic', keywords: ['type 1 diabetes', 't1dm', 'juvenile diabetes', 'insulin dependent'] },
  { code: 'E78.5', name: 'Hyperlipidemia, unspecified', category: 'Endocrine & Metabolic', keywords: ['cholesterol', 'hyperlipidemia', 'dyslipidemia', 'high triglycerides'] },
  { code: 'E03.9', name: 'Hypothyroidism, unspecified', category: 'Endocrine & Metabolic', keywords: ['hypothyroidism', 'low thyroid', 'myxedema'] },
  { code: 'E05.90', name: 'Thyrotoxicosis / Hyperthyroidism, unspecified', category: 'Endocrine & Metabolic', keywords: ['hyperthyroidism', 'thyrotoxicosis', 'graves'] },
  { code: 'E66.9', name: 'Obesity, unspecified', category: 'Endocrine & Metabolic', keywords: ['obesity', 'overweight', 'high bmi'] },
  { code: 'E86.0', name: 'Dehydration', category: 'Endocrine & Metabolic', keywords: ['dehydration', 'volume depletion', 'fluid loss'] },
  { code: 'E79.0', name: 'Hyperuricemia without signs of inflammatory arthritis (Gout risk)', category: 'Endocrine & Metabolic', keywords: ['uric acid', 'hyperuricemia', 'gout'] },

  // Digestive System (K00-K93)
  { code: 'K21.9', name: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive System', keywords: ['gerd', 'acid reflux', 'heartburn', 'indigestion'] },
  { code: 'K29.70', name: 'Gastritis, unspecified, without bleeding', category: 'Digestive System', keywords: ['gastritis', 'dyspepsia', 'stomach upset', 'epigastric pain'] },
  { code: 'K27.9', name: 'Peptic ulcer, site unspecified, unspecified as acute or chronic', category: 'Digestive System', keywords: ['pud', 'peptic ulcer', 'gastric ulcer', 'duodenal ulcer'] },
  { code: 'K58.9', name: 'Irritable bowel syndrome without diarrhea (IBS)', category: 'Digestive System', keywords: ['ibs', 'irritable bowel', 'spastic colon', 'bloating'] },
  { code: 'K59.00', name: 'Constipation, unspecified', category: 'Digestive System', keywords: ['constipation', 'bowel motility', 'hard stool'] },
  { code: 'K35.80', name: 'Unspecified acute appendicitis', category: 'Digestive System', keywords: ['appendicitis', 'right iliac fossa pain', 'acute abdomen'] },
  { code: 'K76.0', name: 'Fatty (change of) liver, not elsewhere classified (NAFLD)', category: 'Digestive System', keywords: ['fatty liver', 'steatosis', 'hepatic steatosis'] },

  // Genitourinary System (N00-N99)
  { code: 'N39.0', name: 'Urinary tract infection, site not specified', category: 'Genitourinary System', keywords: ['uti', 'urinary tract infection', 'cystitis', 'dysuria'] },
  { code: 'N20.1', name: 'Calculus of ureter / kidney stone', category: 'Genitourinary System', keywords: ['kidney stone', 'renal colic', 'nephrolithiasis', 'ureteral stone'] },
  { code: 'N40.0', name: 'Benign prostatic hyperplasia without lower urinary tract symptoms', category: 'Genitourinary System', keywords: ['bph', 'prostate enlargement', 'nocturia', 'urinary hesitancy'] },
  { code: 'N76.0', name: 'Acute vaginitis (Bacterial / Candidal)', category: 'Genitourinary System', keywords: ['vaginitis', 'discharge', 'leukorrhea'] },
  { code: 'N94.6', name: 'Dysmenorrhea, unspecified (Painful menstruation)', category: 'Genitourinary System', keywords: ['dysmenorrhea', 'menstrual cramps', 'period pain'] },
  { code: 'N18.9', name: 'Chronic kidney disease, unspecified', category: 'Genitourinary System', keywords: ['ckd', 'renal failure', 'chronic kidney'] },

  // Musculoskeletal System & Connective Tissue (M00-M99)
  { code: 'M54.50', name: 'Low back pain, unspecified', category: 'Musculoskeletal', keywords: ['back pain', 'lumbago', 'lumbar pain', 'sciatica'] },
  { code: 'M54.2', name: 'Cervicalgia (Neck pain)', category: 'Musculoskeletal', keywords: ['neck pain', 'cervical pain', 'stiff neck'] },
  { code: 'M19.90', name: 'Unspecified osteoarthritis, unspecified site', category: 'Musculoskeletal', keywords: ['osteoarthritis', 'joint pain', 'arthritis', 'knee pain'] },
  { code: 'M06.9', name: 'Rheumatoid arthritis, unspecified', category: 'Musculoskeletal', keywords: ['ra', 'rheumatoid', 'joint inflammation'] },
  { code: 'M10.9', name: 'Gout, unspecified', category: 'Musculoskeletal', keywords: ['gout', 'podagra', 'gouty arthritis', 'urate crystal'] },
  { code: 'M79.1', name: 'Myalgia (Muscle pain / Spasm)', category: 'Musculoskeletal', keywords: ['myalgia', 'muscle aches', 'muscle soreness'] },
  { code: 'M81.0', name: 'Age-related osteoporosis without current pathological fracture', category: 'Musculoskeletal', keywords: ['osteoporosis', 'bone density', 'bone loss'] },

  // Skin & Subcutaneous Tissue (L00-L99)
  { code: 'L20.9', name: 'Atopic dermatitis, unspecified (Eczema)', category: 'Dermatology', keywords: ['eczema', 'atopic dermatitis', 'itchy rash', 'pruritus'] },
  { code: 'L70.0', name: 'Acne vulgaris', category: 'Dermatology', keywords: ['acne', 'pimples', 'comedones', 'breakout'] },
  { code: 'L50.9', name: 'Urticaria, unspecified (Hives)', category: 'Dermatology', keywords: ['urticaria', 'hives', 'allergic rash', 'welts'] },
  { code: 'L03.90', name: 'Cellulitis, unspecified', category: 'Dermatology', keywords: ['cellulitis', 'skin infection', 'erythema'] },
  { code: 'L23.9', name: 'Allergic contact dermatitis, unspecified cause', category: 'Dermatology', keywords: ['contact dermatitis', 'skin allergy'] },
  { code: 'L40.9', name: 'Psoriasis, unspecified', category: 'Dermatology', keywords: ['psoriasis', 'silvery plaques', 'scaly skin'] },

  // Nervous System & Mental Health (G00-G99, F00-F99)
  { code: 'G43.909', name: 'Age-unspecified migraine, not intractable, without status migrainosus', category: 'Neurology', keywords: ['migraine', 'headache', 'hemicrania', 'photophobia'] },
  { code: 'G44.209', name: 'Tension-type headache, unspecified', category: 'Neurology', keywords: ['tension headache', 'stress headache', 'cephalalgia'] },
  { code: 'G40.909', name: 'Epilepsy, unspecified, not intractable', category: 'Neurology', keywords: ['epilepsy', 'seizures', 'convulsions'] },
  { code: 'G47.00', name: 'Insomnia, unspecified', category: 'Neurology', keywords: ['insomnia', 'sleeplessness', 'sleep disorder'] },
  { code: 'F41.1', name: 'Generalized anxiety disorder', category: 'Mental Health', keywords: ['gad', 'anxiety', 'panic', 'nervousness'] },
  { code: 'F32.9', name: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health', keywords: ['depression', 'mdd', 'depressive mood'] },

  // Eye & Ear (H00-H59, H60-H95)
  { code: 'H10.9', name: 'Unspecified conjunctivitis (Pink eye)', category: 'Ophthalmic & ENT', keywords: ['conjunctivitis', 'pink eye', 'red eye', 'eye discharge'] },
  { code: 'H40.9', name: 'Unspecified glaucoma', category: 'Ophthalmic & ENT', keywords: ['glaucoma', 'intraocular pressure', 'optic neuropathy'] },
  { code: 'H66.90', name: 'Otitis media, unspecified, unspecified ear', category: 'Ophthalmic & ENT', keywords: ['otitis media', 'ear infection', 'earache', 'middle ear'] },
  { code: 'H60.90', name: 'Otitis externa, unspecified', category: 'Ophthalmic & ENT', keywords: ['otitis externa', 'swimmer ear', 'ear canal infection'] },
  { code: 'H81.10', name: 'Benign paroxysmal vertigo, unspecified ear', category: 'Ophthalmic & ENT', keywords: ['vertigo', 'dizziness', 'bppv', 'loss of balance'] },

  // Symptoms, Signs & General Clinical Findings (R00-R99)
  { code: 'R50.9', name: 'Fever, unspecified', category: 'General Clinical Signs', keywords: ['fever', 'pyrexia', 'high temperature', 'febrile'] },
  { code: 'R05.9', name: 'Cough, unspecified', category: 'General Clinical Signs', keywords: ['cough', 'dry cough', 'wet cough', 'tussis'] },
  { code: 'R51.9', name: 'Headache, unspecified', category: 'General Clinical Signs', keywords: ['headache', 'head pain', 'cranial ache'] },
  { code: 'R10.9', name: 'Abdominal pain, unspecified', category: 'General Clinical Signs', keywords: ['abdominal pain', 'stomach ache', 'belly pain'] },
  { code: 'R53.83', name: 'Other fatigue / General malaise', category: 'General Clinical Signs', keywords: ['fatigue', 'tiredness', 'malaise', 'lethargy'] },
  { code: 'R11.2', name: 'Nausea with vomiting, unspecified', category: 'General Clinical Signs', keywords: ['nausea', 'vomiting', 'emesis', 'upset stomach'] },
  { code: 'R06.02', name: 'Shortness of breath (Dyspnea)', category: 'General Clinical Signs', keywords: ['shortness of breath', 'dyspnea', 'breathlessness'] },
  { code: 'R42', name: 'Dizziness and giddiness', category: 'General Clinical Signs', keywords: ['dizziness', 'lightheadedness', 'giddiness'] }
];
