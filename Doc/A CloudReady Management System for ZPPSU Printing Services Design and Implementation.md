**A Cloud-Ready Management System for ZPPSU Printing Services: Design and Implementation**

A Capstone Project

Presented to

The Faculty of the College of Information and Computing Science 

Zamboanga Peninsula Polytechnic State University

In Partial Fulfillment of the Requirements

For the Degree of Bachelor of Science in Information Technology

By

Bucoy, Sheniah B.

Dano, Cainmarco A.

Go, Irving Lance S.

Jalani, Mohammad Hasanal U.

  

RODEL R. MARQUEZ, MBA, JD.

Adviser

  
<br/>

May 2026

**CHAPTER 1**

**BACKGROUND OF THE PROBLEM**

  
**1.1 INTRODUCTION**

In today's world, businesses must work quickly and accurately to keep customers happy. In the printing and custom merchandise industry, shops deal with many different tasks every day, like printing documents, designing layouts, and making personalized gifts. As a shop gets more customers, it becomes harder to keep track of every order, deadline, and material needed (AntMyERP, 2025). In places like the Philippines, small printing shops are very important for the local community, but they often find it hard to stay organized as they grow.

Right now, many large printing companies use "Web-to-Print" tools and online systems to handle their work. These systems help them track orders and manage their stocks of paper and ink automatically (OnPrintShop, 2025). However, there is a big problem: many small shops still use old methods. They often write down orders in notebooks or save information in different files that are not connected. This leads to common mistakes like losing a customer's request, finishing jobs late, or running out of supplies without noticing (Konica Minolta, 2024). These "blind spots" make it difficult for owners to see if they are making a profit or if they are wasting materials (AntMyERP, 2025).

For small, local printing businesses, these problems are even more serious. Often, the same person has to talk to customers, design the graphics, and do the actual printing. Because they use different chat apps to talk to clients, it is easy to forget specific details or miss payment proofs. In many cases, using manual notes makes the work 15% to 20% slower than shops that use a computer system. This slow pace can make customers unhappy and cause them to go to a different shop. There is a strong need for a simple and affordable website that can help these local shops manage their daily tasks in one place.

Information Technology (IT) is the best way to solve these problems. A web-based system replaces messy paper notes with a clean, digital database. This ensures that every order is recorded and nothing gets lost. Using a digital system helps a business save money by reducing waste and helping the staff work faster (Persistence Market Research, 2026). The Web-Based Printing and Services Management System is being developed to fix these local issues. It will provide an all-in-one website where the owner can track orders, manage services, and see business reports easily.

**1.2 PROJECT CONTEXT**

For academic and operational purposes, the Zamboanga Peninsula Polytechnic State University (ZPPSU) provides printing services to a sizable community of students, instructors, and administrative personnel. At the moment, transactions, task queuing, and keeping track are managed manually or with fragmented digital tools in the university's traditional walk-in printing facilities. Long wait times, unorganized order handling, and trouble keeping an eye on the stock of necessary supplies like paper and ink are frequently the outcomes of this stress on physical presence and manual tracking.

A Cloud-Ready Management System for ZPPSU Printing Services: Design and Implementation was created to help modernize their operations by moving them away from manual log books and informal ways of communicating. This web-integrated management framework now provides a centralized location for the entire service request (workflow), from the time of the service request to the moment that it is produced. This framework has incorporated a web-based interface that allows users within the university who have submitted service requests to be able to track their printing needs electronically, while providing management with a dashboard to monitor their stock level and day-to-day production.

This system will be developed under ZPPSU to address the particulars of high-volume service delivery in a campus environment. This project seeks to bridge the gap between traditional service delivery and modern efficiencies by providing a structured, digital platform for service delivery on campus. The end goal is to improve the speed and reliability of the university's print shop so that staff can fulfill the needs of each academic year with regard to orders/lost orders, or shortages.

- 1.  **PURPOSE AND DESCRIPTION**  
        The main goal of A Cloud-Ready Management System is a digital platform designed to automate orders, inventory, and financial records for ZPPSU Printing Services. It features a secure workflow that requires a down payment before processing jobs to ensure financial accountability and reduce material waste. By storing data in the cloud, the system allows staff to manage the shop efficiently and access real-time reports from any location.

The system consists of several key features:

- **Order and Deposit Management:** When a customer requests a service, the system generates an order slip. It requires a down payment to be encoded before the job is marked as "In Progress," and it clearly tracks the remaining balance.
- **Cloud-Based Database:** All information is stored online (in the cloud). This means that even if a local computer breaks, the records are safe and can be accessed by authorized staff using a web browser.
- **Inventory Tracking:** The system monitors the usage of supplies like paper, ink, and binding materials. It alerts the staff when items are running low.
- **Automated Reporting:** At the end of the day or month, the system can instantly generate reports on total sales, collected deposits, and pending payments, making the accounting process simple and transparent.

The Cloud-Ready Management System will bridge the gap between traditional campus services and modern information technology; therefore, the ZPPSU Printing Services will be able to operate with greater speed, higher accuracy, and improved accountability.

- 1.  **OBJECTIVES**  
        **1.4.1 GENERAL OBJECTIVES**

The primary objective of this research is to develop and implement a Cloud-Ready Management System for ZPPSU Printing Services to transition from manual processes to a digital workflow. The goal is to establish a safe online platform that manages orders, handles initial payments, and tracks stock to enhance the shop's efficiency and organization.

**1.4.2 SPECIFIC OBJECTIVES**

To complete the overall objective, the following specific objectives must be achieved:

- **To develop a Web Portal with REST API:** Where students can securely upload their documents and choose print settings (like color or number of copies) without using USB drives.
- **To create an Admin Dashboard:** Designing a central workspace for the printing staff to view incoming orders, update the status of print jobs, and manage the daily queue efficiently.
- **To integrate a Digital Payment System:** For students to pay for their orders using digital wallets or a "student credit" account, and to ensure all money is recorded correctly
- **To automate Record-Keeping:** Build a system that generates daily sales reports and tracks paper and ink usage, helping the office manage its supplies more effectively.
- **To test System Reliability:** For evaluating the system’s performance in terms of speed, security, and ease of use to ensure it meets the needs of ZPPSU students and staff.

- 1.  **SCOPE AND LIMITATIONS**

**1.5.1 SCOPE**

The study focuses on developing a Cloud-Ready Management System specifically for the ZPPSU Printing Services. The system includes the following features:

The project covers the following areas and functionalities:

- **Online Submission:** Students can upload files (PDF or Word) and choose settings like color and paper size from their own devices.
- **REST API Integration:** A fast and secure backend that connects the student's request to the office's database
- **Admin Dashboard:** A workspace for staff to see all orders, update the printing status, and manage the queue.
- **Payment Management:** Support for digital payments and a "student credit" system to track money accurately.
- **Automatic Reporting:** The system will create daily summaries of sales and materials used (ink and paper).

**1.5.2 LIMITATIONS**

While the system is advanced, it has the following limits:

- **Internet Dependency:** The system requires a stable internet connection to upload files and update records.
- **Document Type Only:** It is designed for standard documents only and does not support tarpaulin, 3D printing, or large posters.
- **Manual Printing:** The system manages the orders, but the staff must still physically operate the printers to finish the job.
- **User Access:** The system is strictly for ZPPSU students and staff and is not available for outside customers.

**1.6 DEFINITION OF TERMS**

Here are brief descriptions of the terms used in this study to help you understand the technical aspects:

- **Cloud-Ready:** This means the system is built to work on the internet. It allows users to access the printing services from any location using a web browser.
- **REST API:** A set of rules that lets different parts of the system "talk" to each other. It moves data (like your files or payment info) quickly between the student and the server.
- **Management System:** The software used to organize the business. It keeps track of orders, payments, and the list of students using the service.
- **Admin Dashboard:** A special screen for the printing office staff. It shows them all the new orders and helps them manage the daily work.
- **Digital Wallet:** An online app (like GCash or Maya) used to pay for things electronically without using physical cash.
- **Backend:** The "hidden" part of the system that handles the logic, saves the files, and keeps the database safe.
- **Database:** A digital filing cabinet where the system stores all the information about students, their orders, and how much money was paid.
- **Queue:** A digital line or list of print jobs waiting to be finished, arranged in the order they were received.
- **Audit Trail:** A digital record that shows every action taken in the system. It helps the university see exactly who paid and when they paid.

**CHAPTER 2**

**REVIEW OF RELATED LITERATURE AND SYSTEMS**

This chapter provides an overview of all the related studies and related systems that share the same ideas, knowledge, and systems that support the capstone project, A Web-Integrated Management Framework for ZPPSU Printing Services.

**2.1 TECHNICAL BACKGROUND**

A Cloud-Ready Management System for ZPPSU Printing Services: Design and Implementation has been successfully developed using a blend of contemporary web technologies and architectural practices designed for data-intensive operations. This section describes the major technical elements and approaches that contributed to creating an efficient, scalable, and user-friendly website.

**2.1.1 Full-Stack Web Development**

Using a full-stack architecture, the entire system comprises both client-side/front-end (user interfaces that students/staff will use to input information) and server-side/back-end (the server/database that will process and manage orders/inventory data). It builds an integrated interface (user interface on the client-side) with the server/database responsible for processing orders/inventory.

- **Front-end:** HTML and CSS are used to create the layout and design of the website so it looks professional and is easy to read. Javascript Used to make the pages interactive, such as showing a "success" message after a payment is saved or calculating the remaining balance automatically.
- **Back-end:** PHP that connects the website to the database. It handles the logic, like checking if the down payment is enough to start the printing job. Cloud Hosting. Instead of saving files on just one computer, the system is placed on a web server so it can be accessed through the internet from any device.
    - 1.  **Database Management Systems (DBMS)**

The DBMS records customer orders, tracks down payments, and keeps track of inventory levels in place of paper logs, guaranteeing that data is always correct and accessible. The system can swiftly compute balances and provide financial reports thanks to this technology, which offers an accurate and expert method of keeping the shop's documents secure in the cloud.

- - 1.  **Web-to-Print (W2P) Technology**

Web-to-Print (W2P) is a technology that allows students and staff to send their printing jobs through a website instead of going to the office in person. In this system, the user simply logs in, uploads their file, and chooses how they want it printed. This technology connects the customer directly to the printing press through the internet.

- - 1.  **Real-Time Notification and Tracking**

Real-Time Notification and Tracking is a feature that gives users instant updates about their orders. Instead of waiting in line or guessing when a document is ready, students can see the exact status of their print job through the system.

- - 1.  **System Security and Access Control**

The system utilizes Role-Based Access Control because it manages student profiles, as well as financial records. This is a technical structure that allows permission for users at different levels:

- **Student/Faculty:** Only view personal orders/make adjustments (in capacity of student/faculty).
- **Staff:** Updating job-status/printing queue.
- **Admin:** Full access to inventory management and financial analytics.

**RELATED STUDIES** 

- - 1.  **FOREIGN**

**2.2.1. _Cloud-Based Print Management Framework for Campus Services_**

A study from a Malaysian university developed a cloud framework allowing multiple departments to send print jobs remotely. The study highlighted enhanced accessibility and centralized billing as key benefits. overcome by utilizing more straightforward alert-based systems. Ahmad, F. & Tan, S. (2021)

- - 1.  **_Automated Print Job Scheduling and Load Balancing_**

Conducted in a large Indonesian university, this study designed an algorithm to prioritize and distribute print jobs among multiple printers. It significantly reduced bottlenecks during peak hours. Wijaya, R. (2020)

**2.2.3 _Integrating RFID and Web Tracking for Secure Printing_**

A Thai university study combined RFID student IDs with a web interface to release print jobs only when the user is physically present. The system reduced unclaimed printouts by 60%. Sirisawat, P. & Chaiyong, S. (2022)

**2.2.4 _Real-Time Notification System for Campus Printing Services_**

This study from a South African university implemented SMS and email alerts for print job status. Findings indicated improved user experience and reduced follow-up inquiries. Nkosi, B. (2021)

**2.2.5 _Cost Efficiency of Web-Integrated versus Manual Printing Systems_**

A comparative study from an Indian institute analyzed operational costs over one year. The web-integrated system showed 35% lower labor costs and 20% lower consumable waste. Sharma, V. & Patil, N. (2022)

**2.2.6 _Multi-Campus Centralized Printing Management_**

Developed for a university in the United States with multiple branches, this study proposed a centralized web platform that aggregates print requests from all campuses, standardizing pricing and reporting. Thompson, R. (2020)

**2.2.7 _Data Security and Privacy in Academic Printing Systems_**

A European study examined potential data leaks in web-based printing. It recommended encryption for uploaded documents and role-based access controls, which were successfully implemented in a pilot system. Mueller, H. & Klein, A. (2022)

**2.2.8 _Mobile-Responsive Printing Request Platforms_**

A study from a Brazilian university focused on mobile-first design. It found that students preferred submitting print jobs via smartphones, and the responsive interface led to a 50% increase in usage. Costa F. (2021)

**2.2.9 _Workflow Optimization for High-Volume Academic Printing_**

This Australian study used process mining to identify inefficiencies in manual printing. It then designed a web-integrated workflow that automated job routing, reducing turnaround time from hours to minutes. O’Connor, P. (2020)

- - 1.  **LOCAL**

**2.2.10 _E-Queuing and Document Tracking System for University Print Shops_**

This study focused on state universities in Metro Manila that experienced overcrowding in printing services. It proposed an e-queuing system using mobile and web platforms to manage print requests. Results showed a 40% reduction in waiting time and improved customer satisfaction. Reyes, M. & Santos, J. (2021)

- - 1.  **_Assessment of Manual Printing Services in Philippine State Colleges_**

A descriptive study was conducted across three regional state colleges. It identified common issues such as a lack of centralized request monitoring, pricing errors, and unrecorded transactions. The study recommended a digitized management framework as a solution. Gomez, L. (2022)

- - 1.  **_Web-Based Printing Order and Payment Integration for Academic Institutions_**

Developed for a private university in Cebu, this study integrated online ordering with GCash payment. It demonstrated that web integration reduced cash handling errors and improved transaction transparency. Fernandez, C. & Lee R. (2022)

- - 1.  **_User Acceptance of Digital Printing Management Systems in Higher Education_**

Using the Technology Acceptance Model (TAM), this study surveyed 200 students and staff from a Luzon university. It found high acceptance for web-integrated printing systems, especially for features like file uploads and print status notifications. Villanueva, T. (2021)

- - 1.   **_Inventory and Usage Monitoring for University Printing Services_**

This local study proposed a system to track paper, ink, and toner usage in real-time. It concluded that integrating inventory management with a web portal reduced material wastage by 25% in six months. Dela Cruz, A. (2022)

- - 1.  **_Sustainability Impact of Digital Printing Management_**

A Canadian study measured carbon footprint reduction after implementing a web-integrated print management system. It reported a 30% decrease in paper waste and lower energy consumption due to batch printing optimization. Dubois, J. (2021)

**2.3 RELATED SYSTEMS**

- - 1.  **FOREIGN**

**2.3.1 _PrinterOn (Global/Canada-based)_**

A cloud printing platform that allows users to print from any device to any printer on campus. It supports secure release, mobile printing, and detailed usage logs. Widely adopted in universities worldwide. PrinterOn Inc. (2021)

**2.3.2 _PaperCut (Australia)_**

An enterprise print management system that tracks and controls printing across networks. Its web interface allows users to view print quotas, release jobs, and administrators to generate cost reports. Used in many foreign universities. PaperCut Pty Ltd (2022)

**2.3.3 _MyPrintCenter (US – University of Texas_**

A custom web portal for campus printing services. Students log in with their university credentials, upload documents, select finishing options (e.g., stapling, binding), and pay via student account. UT Austin IT (2021)

**2.3.4 _ePRINTit (Singapore – Nanyang Technological University)_**

A comprehensive web and mobile system that integrates printing, copying, and scanning. It features wallet-based payment, secure print release via card swipe, and real-time printer status monitoring. NTU IT Services (2022)

**2.3.5 _FollowMe Printing (UK – Various Universities)_**

A system concept implemented in UK campuses where any print job can be released from any printer after user authentication. The web interface allows job preview, deletion, and prioritization. Various UK Universities (2020)

**2.3.6 _UniPrint Online (Australia – University of Melbourne)_**

A cloud-native system that accepts print orders 24/7. It includes automated file conversion (PDF, Word, PPT), pricing calculator, and integration with student information systems for billing. UniMelb IT (2021)

**2.3.7 _PrintSmart Campus (South Korea – Seoul National University)_**

An advanced system using AI to estimate print job completion times and suggest optimal printers based on current queue lengths. It also features a customer feedback module. SNU CS Dept (2022)

**2.3.8 _QuickPrint WebPortal (Germany – Technical University of Munich)_**

A minimalist but efficient web-based printing management system. It focuses on data privacy by automatically deleting uploaded files after 24 hours and providing encrypted transmission of print jobs. TUM IT (2021)

**2.3.9 Local Literature**

**2.3.9 _PUP PrintXpress (Polytechnic University of the Philippines)_**

An internal web portal for printing services within PUP. Students upload files, select print options, and pick up at designated counters. It includes a queuing number generator and basic payment recording. PUP IT Center (2021)

**2.3.10 _UP PrintHub (University of the Philippines – Diliman)_**

A centralized printing service system that accepts online orders from students and faculty. It features price calculators, print job history, and integration with the university’s e-payment gateway. UP IT Services (2022)

**2.3.11 _DLSU PrintOnDemand (De La Salle University)_**

A web-integrated system that allows document submission from any campus computer or personal device. It also provides an administrative dashboard for tracking daily print volume and revenue. DLSU ITS (2021)

**2.3.12 _AdU ePrint Services (Adamson University)_**

This system combines online file submission with a kiosk-based print release. Users authenticate using their student ID number, and payment is recorded through a prepaid printing credit system. Adamson University (2022)

**2.3.13 _TSU QuickPrint (Tarlac State University)_**

A lightweight web-based system designed for small-scale university printing offices. It includes job queuing, manual price confirmation, and downloadable monthly summary reports for auditing. Tarlac State University (2020)

**2.3.14 _CavSU PrintMate (Cavite State University)_**

A locally developed system with a customer-facing website for submitting print requests and a back-end for print shop staff to mark job statuses (pending, printing, completed, claimed). Cavite State University (2021)

**2.3.15 _WMSU iPrint (Western Mindanao State University)_**

A web-based printing management tool used as a benchmark for ZPPSU. It offers file format validation, automatic pricing based on page count, and email notifications upon job completion. Western Mindanao State University (2022)  
<br/>

**2.3.2 SYNTHESIS OF THE STUDY**

Provide the Table of Synthesis in your synthesis and discuss the table.  
Table 1. Synthesis of the study

|     |     |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
| No. | Title of Study / System | Author/s & Year | Purpose / Objective | Methodology | Key Findings | Relevance to Proposed Project | Research Gap |
| **RELATED STUDIES (Foreign and Local — Minimum of 15)** |     |     |     |     |     |     |     |
| 1   | E-Queuing and Document Tracking System for University Print Shops | Reyes, M. & Santos, J. (2021) | To reduce overcrowding and waiting time in university printing services through an e-queuing and tracking system. | Descriptive-developmental research with user acceptance testing. | Reduced waiting time by 40%; improved customer satisfaction ratings. | Provides queuing logic applicable to ZPPSU’s print request workflow. | Did not integrate financial tracking or billing automation; focused only on queue management. |
| 2   | Assessment of Manual Printing Services in Philippine State Colleges | Gomez, L. (2020) | To identify operational inefficiencies in manual printing systems across three state colleges. | Descriptive survey and observational checklist. | Common issues: lack of centralized monitoring, pricing errors, and unrecorded transactions. | Justifies the need for a web-integrated framework at ZPPSU. | Only assessed problems; did not propose or implement any digital solution. |
| 3   | Web-Based Printing Order and Payment Integration for Academic Institutions | Fernandez, C. & Lee, R. (2022) | To integrate online ordering with GCash payment for a private university in Cebu. | Agile development methodology with pre/post testing. | Reduced cash handling errors and improved transaction transparency. | Demonstrates the feasibility of payment integration for ZPPSU. | Limited to a single payment gateway; no offline fallback or multi-payment options. |
| 4   | User Acceptance of Digital Printing Management Systems in Higher Education | Villanueva, T. (2021) | To measure user acceptance of digital printing systems using the Technology Acceptance Model (TAM). | Quantitative survey (n=200) from a Luzon university. | High acceptance for file uploads and print status notifications. | Validates that ZPPSU stakeholders will likely adopt a web-integrated system. | Did not develop an actual system; only measured hypothetical acceptance. |
| 5   | Inventory and Usage Monitoring for University Printing Services | Dela Cruz, A. (2022) | To track paper, ink, and toner usage in real-time to reduce waste. | Experimental design with before/after inventory analysis. | Reduced material wastage by 25% over six months. | Highlights importance of inventory tracking for ZPPSU’s framework. | Did not integrate customer request management; focused solely on inventory. |
| 6   | Cloud-Based Print Management Framework for Campus Services | Ahmad, F. & Tan, S. (2021) | To enable multiple departments to send print jobs remotely via cloud infrastructure. | Prototyping and performance testing. | Enhanced accessibility and centralized billing. | Supports remote submission feature for ZPPSU. | Lacking real-time print job status notifications and user-side tracking. |
| 7   | Automated Print Job Scheduling and Load Balancing | Wijaya, R. (2020) | To design an algorithm that prioritizes and distributes print jobs among multiple printers. | Algorithm design and simulation. | Reduced bottlenecks during peak hours significantly. | Informs load balancing design for ZPPSU’s multiple printers. | Did not include user authentication or payment logging; purely technical. |
| 8   | Integrating RFID and Web Tracking for Secure Printing | Srisawat, P. & Chaiyong, S. (2022) | To combine RFID student IDs with a web interface for secure print release. | Experimental prototype with RFID integration. | Reduced unclaimed printouts by 60%. | Provides security model for print release at ZPPSU. | Requires RFID hardware; not feasible for institutions without existing RFID system. |
| 9   | Real-Time Notification System for Campus Printing Services | Nkosi, B. (2021) | To implement SMS and email alerts for print job status updates. | Agile development with user feedback loops. | Reduced follow-up inquiries and improved user experience. | Informs notification features for ZPPSU framework. | Did not integrate with payment or queuing modules; standalone notification only. |
| 10  | Cost Efficiency of Web-Integrated versus Manual Printing Systems | Sharma, V. & Patil, N. (2022) | To compare operational costs between web-integrated and manual printing systems over one year. | Comparative cost-benefit analysis. | 35% lower labor costs and 20% lower consumable waste in web system. | Provides economic justification for ZPPSU’s transition. | Did not develop a system; only comparative analysis of existing systems. |
| 11  | Multi-Campus Centralized Printing Management | Thompson, R. (2020) | To propose a centralized web platform for print requests across multiple campuses. | Case study and system design. | Standardized pricing and reporting across all campuses. | Applicable if ZPPSU expands to multi-building or satellite campuses. | Targeted large institutions; overly complex for a single-campus printing office. |
| 12  | Data Security and Privacy in Academic Printing Systems | Mueller, H. & Klein, A. (2022) | To examine data leaks in web-based printing and propose encryption solutions. | Penetration testing and encryption implementation. | Encryption and role-based access controls successfully prevented leaks. | Informs security layer for ZPPSU’s document handling. | Focused only on security; lacked workflow and inventory management. |
| 13  | Mobile-Responsive Printing Request Platforms | Costa, F. (2021) | To design a mobile-first printing request platform. | Responsive web design and usage analytics. | 50% increase in usage due to mobile-friendly interface. | Justifies mobile-responsive design for ZPPSU students. | Did not include administrative backend for staff to manage jobs. |
| 14  | Workflow Optimization for High-Volume Academic Printing | O’Connor, P. (2020) | To use process mining to identify inefficiencies in manual printing and design optimized workflow. | Process mining and workflow simulation. | Reduced turnaround time from hours to minutes. | Directly applicable to ZPPSU’s workflow redesign. | Required specialized process mining tools; not replicable in resource-limited settings. |
| 15  | Sustainability Impact of Digital Printing Management | Dubois, J. (2021) | To measure carbon footprint reduction after implementing digital print management. | Longitudinal environmental impact study. | 30% decrease in paper waste and lower energy consumption. | Supports environmental justification for ZPPSU’s framework. | Did not address user training or transition challenges from manual to digital. |
| RELATED SYSTEMS (Foreign and Local — Minimum of 15) |     |     |     |     |     |     |     |
| 1   | PUP PrintXpress (PUP) | PUP IT Center (2021) | To provide an internal web portal for printing services including queuing and basic payment recording. | In-house system development. | Reduced queue lengths; students can upload files remotely. | Serves as functional benchmark for ZPPSU. | No real-time print job tracking; payment recording is manual and not integrated. |
| 2   | UP PrintHub (UP Diliman) | UP IT Services (2022) | To centralize printing services with e-payment gateway integration. | Custom web development with e-payment API. | Price calculator and print job history available. | Demonstrates successful e-payment integration for ZPPSU. | Lacks inventory management for consumables (paper, toner). |
| 3   | DLSU PrintOnDemand | DLSU ITS (2021) | To allow document submission from any campus device with administrative dashboards. | Enterprise system development. | Daily print volume and revenue tracking available. | Administrative dashboard concept applicable to ZPPSU. | No mobile-responsive interface; desktop-only access. |
| 4   | AdU ePrint Services | Adamson University (2022) | To combine online file submission with kiosk-based print release using prepaid credits. | Integrated hardware-software system. | Prepaid credit system reduced cash handling. | Prepaid model could be adapted for ZPPSU. | Requires kiosk hardware; not purely web-integrated. |
| 5   | TSU QuickPrint | Tarlac State University (2020) | To provide lightweight web-based printing for small-scale university offices. | PHP/MySQL development. | Basic job queuing and downloadable monthly reports. | Simple architecture suitable as starting reference for ZPPSU. | Lacks user authentication and role-based access control. |
| 6   | CavSU PrintMate | Cavite State University (2021) | To build customer-facing website for print requests with backend staff dashboard. | Waterfall methodology. | Job status tracking (pending, printing, completed, claimed) implemented. | Status tracking feature directly applicable to ZPPSU. | No automated pricing or billing integration. |
| 7   | WMSU iPrint | Western Mindanao State University (2022) | To provide web-based printing with file validation and email notifications. | Iterative development. | Automatic pricing based on page count. | Serves as closest local benchmark to ZPPSU. | Limited to email notifications; no SMS or real-time chat support. PrinterOn |
| 8   | PrinterOn | PrinterOn Inc. (2021) | To enable cloud printing from any device to any campus printer with secure release. | Commercial cloud platform. | Widely adopted; supports mobile printing and usage logs. | Cloud model could be adapted for ZPPSU. | Commercial licensing is expensive; not designed for single-department use. |
| 9   | PaperCut | PaperCut Pty Ltd (2022) | To track and control printing across networks with web interface for quotas and reporting. | Enterprise print management platform. | Popular in foreign universities; detailed cost reporting. | Reporting features useful for ZPPSU administration. | Requires network-level printer integration; overkill for small printing shop. |
| 10  | MyPrintCenter (UT Austin) | UT Austin IT (2021) | To provide custom web portal for campus printing with finishing options and student account billing. | Custom university system. | Students can select stapling, binding, etc.; pay via student account. | Finishing options feature relevant to ZPPSU. | Tightly integrated with university billing system; not transferrable as-is. |
| 11  | ePRINTit (NTU Singapore) | NTU IT Services (2022) | To provide comprehensive web/mobile system with wallet-based payment and secure print release. | Full-stack development with card reader integration. | Real-time printer status monitoring implemented. | Wallet system concept applicable to ZPPSU. | Requires physical card readers for release; not purely web-based. |
| 12  | FollowMe Printing (UK Universities) | Various UK Universities (2020) | To allow any print job to be released from any printer after authentication. | Distributed system architecture. | Job preview, deletion, and prioritization available. | Job prioritization concept useful for ZPPSU. | Requires networked printers with embedded software; high setup cost. |
| 13  | UniPrint Online (Univ. of Melbourne) | UniMelb IT (2021) | To accept print orders 24/7 with automated file conversion and SIS integration. | Cloud-native platform. | Automated file conversion (PDF, Word, PPT) successful. | File conversion feature relevant for ZPPSU to ensure print-ready formats. | Complex integration with Student Information System; beyond ZPPSU’s current scope. |
| 14  | PrintSmart Campus (Seoul National Univ.) | SNU CS Dept (2022) | To use AI for estimating job completion times and suggesting optimal printers. | AI/ML model with queuing simulation. | Reduced customer wait time through intelligent suggestions. | AI estimation concept could be future enhancement for ZPPSU. | Requires AI expertise and large dataset; not feasible for initial framework. |
| 15  | QuickPrint WebPortal (TU Munich) | TUM IT (2021) | To provide minimalist web-based printing with strong data privacy (auto-deletion, encryption). | Security-focused development. | Encrypted transmission and auto-deletion after 24 hours. | Data privacy features directly applicable to ZPPSU student documents. | No inventory or financial management modules included. |

  
<br/>

  

**CHAPTER 3**

**DESIGN AND METHODOLOGY**

- 1.  **REQUIREMENTS ANALYSIS**

**3.1.1 Requirements Elicitation (Gathering the Facts)**

The process of gathering all the data required to create a system that really functions for its users is known as requirements elicitation. In order to ensure the success of the ZPPSU Printing Management System, information was obtained through surveys from students who utilize the service, observations of the existing lengthy queues, and interviews with the printing personnel. Through an analysis of the existing manual logs, the researcher was able to pinpoint the characteristics that the new system needs to include by identifying the issues with USB drives and cash payments.

**3.1.2 Requirements Analysis Strategy (Organizing the Plan)**

At this point, the data collected from students and employees is divided into two categories: Functional Requirements (what the system does, like uploading files) and Non-Functional Requirements (how the system operates, such as being quick and safe). The approach entails drawing a Use Case Diagram to specify precisely what the student and the administrator may do within the app, as well as a Data Flow Diagram to illustrate how a student's work travels through the REST API to the printer. The developer can prevent errors during the actual development process and guarantee a dependable and user-friendly final ZPPSU Printing Management System by first organizing this data.

**3.1.3 Functional and Non-Functional Requirements (The System Features)**

**Functional and Non-Functional Requirements** define the specific rules and qualities the system must have to work correctly. Functional Requirements are the actual tasks the system performs, such as allowing a student to log in, upload a file, or choose if they want color or black-and-white printing. These are the "actions" that make the system useful for the users and the staff.

**Non-Functional Requirements** describe how the system should behave rather than what it does. This includes things like security, ensuring that student files and payment details are kept private, and performance, making sure the website loads quickly even when many people are using it. Together, these requirements serve as a checklist to ensure the ZPPSU Printing Management System is both helpful and reliable for the university.

- 1.  **REQUIREMENTS DOCUMENTATION REQUIREMENTS DOCUMENTATION**

The official written record of every feature and regulation the system has to conform to is called requirements documentation. To ensure that everyone has an agreement on how the software will function, it acts as a clear contract between the institution and the developers. The user interface, database structure, and REST API connections are all clearly described in this article. By putting these specifics in writing, the team has a permanent guide to refer to during the testing and construction stages, preventing costly errors or missed features.

Furthermore, this documentation aids in system maintenance in the future. If ZPPSU Printing Services later wants to add new capabilities, such as support for mobile apps or 3D printing, the developers can review this record to learn how the initial system was developed. It contains the technical details as well as "User Stories" that describe in detail how a staff member or student uses the website. To put it briefly, the master plan makes sure the project stays on course and achieves all of the university's objectives.

**3.3 DESIGN OF SOFTWARE SYSTEM PRODUCTS AND PROCESS**

**RAD SDLC or Agile**

Use Case analysis

The Use Case Diagram illustrates the interactions between the users and the Cloud-Ready Management System for ZPPSU Printing Services. The diagram identifies two main actors: the admin (Printing Staff) and the User (Student/Faculty). It shows the different functions each actor can perform within the system, such as signing up or logging in, viewing the dashboard, uploading documents, placing print orders, making down payments, tracking order status, viewing payment history, and receiving notifications. The diagram helps explain the flow of activities and defines how the system supports both users and administrators in managing printing services efficiently and securely.

DFD Diagram

The Context Diagram presents the overall flow of data between the external entities and the Cloud-Ready Management System for ZPPSU Printing Services. It shows how the Student/Faculty User interacts with the system by registering, submitting print orders, uploading documents, and making payments. The Admin/Printing Staff manages order updates, inventory monitoring, and report generation through the system dashboard. The Payment Gateway processes online transactions and sends payment confirmations to the system. This diagram provides a high-level overview of how information enters and exits the system, helping users understand the major interactions and communication flow within the printing management process.

Architectural Design

EMAIL SERVICE

- Send Order Updates
- Send Recepts/Notifications

CLOUD STORAGE

- Store Uploaded Files
- Retrieve Files

PAYMENT GATEWAY

- Process Payments
- Payment Status

The framework shows three external service components commonly integrated into an information system. The first is a Payment Gateway used for processing online payments through services like GCash, Maya, or banks. The second is Cloud Storage, which handles the storage and retrieval of uploaded files. The third is an Email Service that sends order updates, receipts, and notifications through SMTP or Email API systems.