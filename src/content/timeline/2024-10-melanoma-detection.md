---
title: AI Histopathology Analysis — Melanoma Detection
org: MIARP Research Group
category: project
startDate: 2024-10-01
summary: Melanoma detection on histopathological images with YOLOv8, in collaboration with the MIARP Research Group.
tech: ['Python', 'YOLOv8', 'PyTorch', 'Histopathology']
featured: true
dateApproximate: true
---

Melanoma detection models built on histopathological images, in collaboration with
the MIARP Research Group and written up as a research paper.

- Developed detection models using YOLOv8 on histopathological slide imagery
- Improved model performance through targeted data preprocessing, training and evaluation
- Assessed results using mAP and F1-score

Histopathology slides are unusually demanding as an input: enormous resolution,
staining that varies between labs, and the diagnostically relevant structure sitting
at a scale far smaller than the image itself. Most of the gain came from the
preprocessing pipeline rather than from changes to the model.
