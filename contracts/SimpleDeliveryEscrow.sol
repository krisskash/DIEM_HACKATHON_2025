// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleDeliveryEscrow {
    
    struct Job {
        address customer;
        address gigWorker;
        uint256 amount;
        bool completed;
    }
    
    mapping(string => Job) public jobs;
    address public platform;
    
    event JobCreated(string jobId, address customer, uint256 amount);
    event JobAccepted(string jobId, address gigWorker);
    event JobCompleted(string jobId, address gigWorker, uint256 amount);
    
    constructor() {
        platform = msg.sender;
    }
    
    // Customer creates job and pays
    function createJob(string memory jobId) external payable {
        require(msg.value > 0, "Payment required");
        require(jobs[jobId].customer == address(0), "Job exists");
        
        jobs[jobId] = Job({
            customer: msg.sender,
            gigWorker: address(0),
            amount: msg.value,
            completed: false
        });
        
        emit JobCreated(jobId, msg.sender, msg.value);
    }
    
    // Gig worker accepts job
    function acceptJob(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(job.customer != address(0), "Job does not exist");
        require(job.gigWorker == address(0), "Job already accepted");
        
        job.gigWorker = msg.sender;
        emit JobAccepted(jobId, msg.sender);
    }
    
    // Complete delivery and release payment
    function completeDelivery(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.customer || msg.sender == job.gigWorker, "Not authorized");
        require(!job.completed, "Already completed");
        require(job.gigWorker != address(0), "No worker assigned");
        
        job.completed = true;
        
        // 90% to gig worker, 10% platform fee
        uint256 workerPayout = (job.amount * 90) / 100;
        uint256 platformFee = job.amount - workerPayout;
        
        payable(job.gigWorker).transfer(workerPayout);
        payable(platform).transfer(platformFee);
        
        emit JobCompleted(jobId, job.gigWorker, workerPayout);
    }
    
    // Get job info
    function getJob(string memory jobId) external view returns (
        address customer,
        address gigWorker,
        uint256 amount,
        bool completed
    ) {
        Job memory job = jobs[jobId];
        return (job.customer, job.gigWorker, job.amount, job.completed);
    }
}
