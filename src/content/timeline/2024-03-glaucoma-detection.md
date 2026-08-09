---
title: ML Glaucoma Detection
category: project
startDate: 2024-03-01
summary: YOLOv8 detection models for glaucoma on the PAPILA fundus dataset, written up as a research paper.
tech: ['Python', 'YOLOv8', 'PyTorch', 'PASCAL VOC', 'PAPILA']
featured: false
dateApproximate: true
---

Developed glaucoma detection models using YOLOv8, trained on the PAPILA dataset
in PASCAL VOC annotation format.

- Trained and evaluated detection models on retinal fundus imagery
- Measured performance with the standard detection metrics — mAP, sensitivity and F1-score
- Written up as a research paper

Sensitivity carries disproportionate weight in a screening context: a missed
glaucoma case costs far more than a false positive that a clinician then rules out,
so the evaluation was framed around recall rather than headline accuracy.
