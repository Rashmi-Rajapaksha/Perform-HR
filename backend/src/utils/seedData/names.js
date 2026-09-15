/**
 * Name pools used to generate realistic (but synthetic) employee records.
 * Deliberately broad/mixed to represent a diverse manufacturing workforce.
 */
const FIRST_NAMES_MALE = [
  'Kasun', 'Nimal', 'Sunil', 'Chamara', 'Ruwan', 'Dilshan', 'Ashan', 'Prasad', 'Roshan', 'Chinthaka',
  'Lahiru', 'Nuwan', 'Sampath', 'Damith', 'Kalana', 'Buddhika', 'Isuru', 'Tharindu', 'Janaka', 'Gayan',
  'Manoj', 'Ajith', 'Suresh', 'Ravindra', 'Chandima', 'Priyantha', 'Susantha', 'Amila', 'Kelum', 'Dinesh',
  'Michael', 'James', 'David', 'Robert', 'John', 'Daniel', 'Matthew', 'Andrew', 'Joseph', 'Kevin',
  'Ahmed', 'Mohamed', 'Ali', 'Hassan', 'Farhan', 'Imran', 'Rizwan', 'Zain', 'Kabir', 'Nasir',
];

const FIRST_NAMES_FEMALE = [
  'Nadeeka', 'Chamila', 'Kumari', 'Priyanka', 'Dilrukshi', 'Anusha', 'Malini', 'Sandya', 'Hashini', 'Ishara',
  'Tharuka', 'Nilmini', 'Chathurika', 'Sanduni', 'Iresha', 'Gayani', 'Nimesha', 'Vindya', 'Kavindi', 'Piumi',
  'Ruwangi', 'Sachini', 'Dulani', 'Thilini', 'Roshani', 'Manisha', 'Sewwandi', 'Chathumini', 'Kaveesha', 'Nayana',
  'Sarah', 'Emma', 'Jennifer', 'Linda', 'Patricia', 'Michelle', 'Elizabeth', 'Karen', 'Nancy', 'Laura',
  'Fatima', 'Ayesha', 'Zainab', 'Sana', 'Noor', 'Amina', 'Hafsa', 'Maryam', 'Sadia', 'Rabia',
];

const LAST_NAMES = [
  'Perera', 'Silva', 'Fernando', 'Jayasuriya', 'Wickramasinghe', 'Bandara', 'Gunawardena', 'Rajapaksha',
  'Dissanayake', 'Ratnayake', 'Herath', 'Karunaratne', 'Senanayake', 'Weerasinghe', 'Abeysekara',
  'Amarasinghe', 'Mendis', 'Wijesinghe', 'Gunasekara', 'Kumarasinghe', 'Rathnayake', 'Samarasinghe',
  'Wijeratne', 'Ekanayake', 'Pathirana', 'Jayawardena', 'Kariyawasam', 'Liyanage', 'Madushanka', 'Peiris',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Wilson', 'Anderson',
  'Khan', 'Ahmed', 'Malik', 'Hussain', 'Sheikh', 'Chowdhury', 'Rahman', 'Islam', 'Qureshi', 'Siddiqui',
];

module.exports = { FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES };
